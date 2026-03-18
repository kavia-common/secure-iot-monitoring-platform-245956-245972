const { ObjectId } = require('mongodb');
const { getDb } = require('../db/mongo');
const {
  DEVICE_TYPES,
  EVENT_TYPES,
  EVENT_SEVERITIES
} = require('../config/constants');
const { HttpError } = require('../utils/errors');
const {
  sanitizeEvent,
  sanitizeDevice,
  buildPaginatedResponse,
  parsePositiveInteger,
  parseBoolean
} = require('../utils/serializers');
const { evaluateSuspiciousActivity } = require('./suspiciousDetectionService');
const {
  emitDeviceUpdated,
  emitEventCreated,
  emitEventAcknowledged,
  emitStatsSnapshot
} = require('./realtimeService');

function validateDate(value, fieldName) {
  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new HttpError(400, `${fieldName} must be a valid date.`, 'EVENT_DATE_INVALID');
  }

  return parsedDate;
}

function defaultSeverityForEventType(eventType) {
  if (eventType === 'tamper_detected') {
    return 'critical';
  }

  if (eventType === 'heartbeat_missed' || eventType === 'motion_detected') {
    return 'warning';
  }

  return 'info';
}

function defaultMessageForEvent(device, eventType, source) {
  const messages = {
    motion_detected: `${device.name} detected motion activity.`,
    door_opened: `${device.name} was opened.`,
    door_closed: `${device.name} was closed.`,
    heartbeat_missed: `${device.name} missed a scheduled heartbeat.`,
    tamper_detected: `${device.name} reported a tamper condition.`
  };

  return `${messages[eventType]} Source: ${source || 'system'}.`;
}

function nextDeviceStatus(eventType, severity, suspicious) {
  if (eventType === 'heartbeat_missed') {
    return 'offline';
  }

  if (suspicious || severity === 'critical') {
    return 'alert';
  }

  return 'online';
}

// PUBLIC_INTERFACE
/**
 * Returns filtered event logs with pagination metadata.
 *
 * @param {object} queryParams - Query string filters for logs, severity, dates, and pagination.
 * @returns {Promise<object>} Paginated list of sanitized events.
 */
async function listEvents(queryParams) {
  const eventsCollection = getDb().collection('events');
  const query = {};

  if (queryParams.deviceId) {
    query.deviceId = String(queryParams.deviceId).trim();
  }

  if (queryParams.deviceType) {
    if (!DEVICE_TYPES.includes(queryParams.deviceType)) {
      throw new HttpError(400, 'Invalid deviceType filter.', 'EVENT_DEVICE_TYPE_INVALID');
    }

    query.deviceType = queryParams.deviceType;
  }

  if (queryParams.eventType) {
    if (!EVENT_TYPES.includes(queryParams.eventType)) {
      throw new HttpError(400, 'Invalid eventType filter.', 'EVENT_TYPE_INVALID');
    }

    query.eventType = queryParams.eventType;
  }

  if (queryParams.severity) {
    if (!EVENT_SEVERITIES.includes(queryParams.severity)) {
      throw new HttpError(400, 'Invalid severity filter.', 'EVENT_SEVERITY_INVALID');
    }

    query.severity = queryParams.severity;
  }

  const suspiciousOnly = parseBoolean(queryParams.suspiciousOnly);
  if (typeof suspiciousOnly === 'boolean') {
    query.suspicious = suspiciousOnly;
  }

  const acknowledged = parseBoolean(queryParams.acknowledged);
  if (typeof acknowledged === 'boolean') {
    query.acknowledged = acknowledged;
  }

  const startDate = queryParams.dateFrom || queryParams.startDate || queryParams.from;
  const endDate = queryParams.dateTo || queryParams.endDate || queryParams.to;

  if (startDate || endDate) {
    query.timestamp = {};

    if (startDate) {
      query.timestamp.$gte = validateDate(startDate, 'dateFrom');
    }

    if (endDate) {
      query.timestamp.$lte = validateDate(endDate, 'dateTo');
    }
  }

  const page = parsePositiveInteger(queryParams.page, 1);
  const limit = Math.min(parsePositiveInteger(queryParams.limit, 25), 100);
  const skip = (page - 1) * limit;

  const [documents, total] = await Promise.all([
    eventsCollection
      .find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    eventsCollection.countDocuments(query)
  ]);

  return buildPaginatedResponse(
    documents.map((document) => sanitizeEvent(document)),
    page,
    limit,
    total
  );
}

// PUBLIC_INTERFACE
/**
 * Returns a single event by MongoDB identifier.
 *
 * @param {string} eventId - MongoDB event identifier.
 * @returns {Promise<object>} Sanitized event payload.
 */
async function getEventById(eventId) {
  if (!ObjectId.isValid(eventId)) {
    throw new HttpError(400, 'Invalid event identifier.', 'EVENT_ID_INVALID');
  }

  const event = await getDb().collection('events').findOne({
    _id: new ObjectId(eventId)
  });

  if (!event) {
    throw new HttpError(404, 'Event was not found.', 'EVENT_NOT_FOUND');
  }

  return sanitizeEvent(event);
}

// PUBLIC_INTERFACE
/**
 * Acknowledges an event and broadcasts the change to realtime clients.
 *
 * @param {string} eventId - MongoDB event identifier.
 * @param {object} user - Authenticated user acknowledging the event.
 * @returns {Promise<object>} Sanitized acknowledged event payload.
 */
async function acknowledgeEvent(eventId, user) {
  if (!ObjectId.isValid(eventId)) {
    throw new HttpError(400, 'Invalid event identifier.', 'EVENT_ID_INVALID');
  }

  const eventsCollection = getDb().collection('events');
  const existingEvent = await eventsCollection.findOne({
    _id: new ObjectId(eventId)
  });

  if (!existingEvent) {
    throw new HttpError(404, 'Event was not found.', 'EVENT_NOT_FOUND');
  }

  if (existingEvent.acknowledged) {
    return sanitizeEvent(existingEvent);
  }

  await eventsCollection.updateOne(
    { _id: existingEvent._id },
    {
      $set: {
        acknowledged: true,
        acknowledgedAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          ...(existingEvent.metadata || {}),
          acknowledgedBy: user.email
        }
      }
    }
  );

  const updatedEvent = await eventsCollection.findOne({
    _id: existingEvent._id
  });

  const serializedEvent = sanitizeEvent(updatedEvent);
  emitEventAcknowledged(serializedEvent);
  await emitStatsSnapshot();

  return serializedEvent;
}

// PUBLIC_INTERFACE
/**
 * Persists a new device event, applies suspicious detection, updates device status,
 * and broadcasts the resulting changes through Socket.IO.
 *
 * @param {object} payload - Event creation payload including the target device and event details.
 * @returns {Promise<{event: object, device: object}>} Serialized event and updated device payloads.
 */
async function createEventForDevice(payload) {
  const {
    device,
    eventType,
    severity,
    message,
    source,
    metadata,
    timestamp,
    forceSuspicious
  } = payload;

  if (!device || !device._id) {
    throw new HttpError(400, 'A valid device is required.', 'EVENT_DEVICE_REQUIRED');
  }

  if (!EVENT_TYPES.includes(eventType)) {
    throw new HttpError(400, 'Invalid event type.', 'EVENT_TYPE_INVALID');
  }

  const eventTimestamp = timestamp ? validateDate(timestamp, 'timestamp') : new Date();
  const finalSeverity = severity || defaultSeverityForEventType(eventType);

  if (!EVENT_SEVERITIES.includes(finalSeverity)) {
    throw new HttpError(400, 'Invalid event severity.', 'EVENT_SEVERITY_INVALID');
  }

  const detectionResult = await evaluateSuspiciousActivity(
    device.deviceId,
    eventTimestamp,
    eventType
  );

  const suspicious = forceSuspicious === true || detectionResult.suspicious;
  const eventDocument = {
    deviceId: device.deviceId,
    deviceName: device.name,
    deviceType: device.type,
    location: device.location,
    eventType,
    severity: finalSeverity,
    suspicious,
    source: source || 'system',
    message: String(message || defaultMessageForEvent(device, eventType, source || 'system')).trim(),
    acknowledged: false,
    acknowledgedAt: null,
    metadata: {
      ...(metadata || {}),
      detectionReason: detectionResult.reason,
      triggerCountLastWindow: detectionResult.triggerCountLastWindow,
      windowSeconds: detectionResult.windowSeconds,
      threshold: detectionResult.threshold
    },
    timestamp: eventTimestamp,
    createdAt: new Date(),
    updatedAt: null,
    isSeedData: false
  };

  const database = getDb();
  const eventsCollection = database.collection('events');
  const devicesCollection = database.collection('devices');

  const insertResult = await eventsCollection.insertOne(eventDocument);
  const createdEvent = await eventsCollection.findOne({
    _id: insertResult.insertedId
  });

  await devicesCollection.updateOne(
    { _id: device._id },
    {
      $set: {
        status: nextDeviceStatus(eventType, finalSeverity, suspicious),
        lastSeenAt: eventTimestamp,
        updatedAt: new Date()
      }
    }
  );

  const updatedDevice = await devicesCollection.findOne({
    _id: device._id
  });

  const serializedEvent = sanitizeEvent(createdEvent);
  const serializedDevice = sanitizeDevice(updatedDevice || device);

  emitEventCreated(serializedEvent);
  emitDeviceUpdated(serializedDevice);
  await emitStatsSnapshot();

  return {
    event: serializedEvent,
    device: serializedDevice
  };
}

module.exports = {
  listEvents,
  getEventById,
  acknowledgeEvent,
  createEventForDevice
};
