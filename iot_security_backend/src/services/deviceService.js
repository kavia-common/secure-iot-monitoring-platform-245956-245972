const { ObjectId } = require('mongodb');
const { getDb } = require('../db/mongo');
const {
  DEVICE_TYPES,
  DEVICE_STATUSES,
  EVENT_TYPES,
  EVENT_SEVERITIES
} = require('../config/constants');
const { HttpError } = require('../utils/errors');
const {
  sanitizeDevice,
  buildPaginatedResponse,
  parsePositiveInteger
} = require('../utils/serializers');
const { createEventForDevice } = require('./eventService');
const {
  emitDeviceUpdated,
  emitDeviceDeleted,
  emitStatsSnapshot
} = require('./realtimeService');

function buildRegexSearch(value) {
  return new RegExp(String(value).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
}

function coerceBatteryLevel(value) {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0 || parsedValue > 100) {
    throw new HttpError(
      400,
      'batteryLevel must be a number between 0 and 100.',
      'DEVICE_BATTERY_INVALID'
    );
  }

  return Math.round(parsedValue);
}

function buildDeviceId(type, name) {
  return `${type}-${slugify(name) || 'device'}-${Date.now().toString(36)}`;
}

async function findDeviceDocument(identifier) {
  const devicesCollection = getDb().collection('devices');

  if (ObjectId.isValid(identifier)) {
    const deviceByObjectId = await devicesCollection.findOne({
      _id: new ObjectId(identifier)
    });

    if (deviceByObjectId) {
      return deviceByObjectId;
    }
  }

  return devicesCollection.findOne({
    deviceId: String(identifier).trim()
  });
}

async function ensureUniqueDeviceId(deviceId, excludeId) {
  const query = {
    deviceId: String(deviceId).trim()
  };

  const existingDevice = await getDb().collection('devices').findOne(query);

  if (existingDevice && (!excludeId || existingDevice._id.toString() !== excludeId.toString())) {
    throw new HttpError(409, 'A device with that deviceId already exists.', 'DEVICE_ID_EXISTS');
  }
}

function validateEventTypeForDevice(deviceType, eventType) {
  const allowedEventsByType = {
    motion: ['motion_detected', 'heartbeat_missed', 'tamper_detected'],
    door: ['door_opened', 'door_closed', 'tamper_detected', 'heartbeat_missed']
  };

  if (!allowedEventsByType[deviceType].includes(eventType)) {
    throw new HttpError(
      400,
      `Event type ${eventType} is not valid for a ${deviceType} device.`,
      'DEVICE_EVENT_TYPE_INVALID'
    );
  }
}

function normalizeDevicePayload(payload, options = {}) {
  const partial = Boolean(options.partial);
  const normalizedPayload = {};

  if (!partial || payload.name !== undefined) {
    const name = String(payload.name || '').trim();
    if (!partial && !name) {
      throw new HttpError(400, 'Device name is required.', 'DEVICE_NAME_REQUIRED');
    }
    if (name) {
      normalizedPayload.name = name;
    }
  }

  if (!partial || payload.type !== undefined) {
    const type = String(payload.type || '').trim();
    if (!partial && !type) {
      throw new HttpError(400, 'Device type is required.', 'DEVICE_TYPE_REQUIRED');
    }
    if (type) {
      if (!DEVICE_TYPES.includes(type)) {
        throw new HttpError(400, 'Device type must be motion or door.', 'DEVICE_TYPE_INVALID');
      }
      normalizedPayload.type = type;
    }
  }

  if (!partial || payload.location !== undefined) {
    const location = String(payload.location || '').trim();
    if (!partial && !location) {
      throw new HttpError(400, 'Device location is required.', 'DEVICE_LOCATION_REQUIRED');
    }
    if (location) {
      normalizedPayload.location = location;
    }
  }

  if (payload.status !== undefined) {
    const status = String(payload.status || '').trim();
    if (!DEVICE_STATUSES.includes(status)) {
      throw new HttpError(
        400,
        'Device status must be online, offline, maintenance, or alert.',
        'DEVICE_STATUS_INVALID'
      );
    }
    normalizedPayload.status = status;
  }

  if (payload.deviceId !== undefined) {
    const deviceId = String(payload.deviceId || '').trim();
    if (!deviceId) {
      throw new HttpError(400, 'deviceId cannot be empty.', 'DEVICE_ID_INVALID');
    }
    normalizedPayload.deviceId = deviceId;
  }

  if (payload.firmwareVersion !== undefined) {
    normalizedPayload.firmwareVersion = payload.firmwareVersion
      ? String(payload.firmwareVersion).trim()
      : null;
  }

  if (payload.ipAddress !== undefined) {
    normalizedPayload.ipAddress = payload.ipAddress
      ? String(payload.ipAddress).trim()
      : null;
  }

  const batteryLevel = coerceBatteryLevel(payload.batteryLevel);
  if (batteryLevel !== undefined) {
    normalizedPayload.batteryLevel = batteryLevel;
  }

  if (payload.lastSeenAt !== undefined) {
    const parsedDate = new Date(payload.lastSeenAt);
    if (Number.isNaN(parsedDate.getTime())) {
      throw new HttpError(400, 'lastSeenAt must be a valid date.', 'DEVICE_LAST_SEEN_INVALID');
    }
    normalizedPayload.lastSeenAt = parsedDate;
  }

  return normalizedPayload;
}

// PUBLIC_INTERFACE
/**
 * Returns devices with optional filtering and pagination support.
 *
 * @param {object} queryParams - Query string filters and pagination values.
 * @returns {Promise<object>} Paginated device response object.
 */
async function listDevices(queryParams) {
  const devicesCollection = getDb().collection('devices');
  const query = {};

  if (queryParams.type) {
    if (!DEVICE_TYPES.includes(queryParams.type)) {
      throw new HttpError(400, 'Invalid device type filter.', 'DEVICE_TYPE_INVALID');
    }
    query.type = queryParams.type;
  }

  if (queryParams.status) {
    if (!DEVICE_STATUSES.includes(queryParams.status)) {
      throw new HttpError(400, 'Invalid device status filter.', 'DEVICE_STATUS_INVALID');
    }
    query.status = queryParams.status;
  }

  if (queryParams.location) {
    query.location = buildRegexSearch(queryParams.location);
  }

  if (queryParams.search) {
    const searchRegex = buildRegexSearch(queryParams.search);
    query.$or = [
      { name: searchRegex },
      { location: searchRegex },
      { deviceId: searchRegex }
    ];
  }

  const page = parsePositiveInteger(queryParams.page, 1);
  const limit = Math.min(parsePositiveInteger(queryParams.limit, 25), 100);
  const skip = (page - 1) * limit;

  const [documents, total] = await Promise.all([
    devicesCollection
      .find(query)
      .sort({ updatedAt: -1, name: 1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    devicesCollection.countDocuments(query)
  ]);

  return buildPaginatedResponse(
    documents.map((document) => sanitizeDevice(document)),
    page,
    limit,
    total
  );
}

// PUBLIC_INTERFACE
/**
 * Returns a single device by MongoDB id or stable deviceId.
 *
 * @param {string} identifier - MongoDB id or deviceId.
 * @returns {Promise<object>} Sanitized device payload.
 */
async function getDeviceByIdentifier(identifier) {
  const device = await findDeviceDocument(identifier);

  if (!device) {
    throw new HttpError(404, 'Device was not found.', 'DEVICE_NOT_FOUND');
  }

  return sanitizeDevice(device);
}

// PUBLIC_INTERFACE
/**
 * Creates a new device document and emits a realtime update.
 *
 * @param {object} payload - Device fields supplied by the client.
 * @returns {Promise<object>} Sanitized created device payload.
 */
async function createDevice(payload) {
  const devicesCollection = getDb().collection('devices');
  const normalizedPayload = normalizeDevicePayload(payload);
  const now = new Date();
  const deviceDocument = {
    deviceId: normalizedPayload.deviceId || buildDeviceId(normalizedPayload.type, normalizedPayload.name),
    name: normalizedPayload.name,
    type: normalizedPayload.type,
    location: normalizedPayload.location,
    status: normalizedPayload.status || 'online',
    batteryLevel: normalizedPayload.batteryLevel ?? 100,
    firmwareVersion: normalizedPayload.firmwareVersion || '1.0.0',
    ipAddress: normalizedPayload.ipAddress || null,
    lastSeenAt: normalizedPayload.lastSeenAt || now,
    isSeedData: false,
    createdAt: now,
    updatedAt: now
  };

  await ensureUniqueDeviceId(deviceDocument.deviceId);
  const insertResult = await devicesCollection.insertOne(deviceDocument);
  const createdDevice = await devicesCollection.findOne({ _id: insertResult.insertedId });
  const serializedDevice = sanitizeDevice(createdDevice);

  emitDeviceUpdated(serializedDevice);
  await emitStatsSnapshot();

  return serializedDevice;
}

// PUBLIC_INTERFACE
/**
 * Updates an existing device and emits a realtime update.
 *
 * @param {string} identifier - MongoDB id or deviceId.
 * @param {object} payload - Partial device fields to update.
 * @returns {Promise<object>} Sanitized updated device payload.
 */
async function updateDevice(identifier, payload) {
  const devicesCollection = getDb().collection('devices');
  const existingDevice = await findDeviceDocument(identifier);

  if (!existingDevice) {
    throw new HttpError(404, 'Device was not found.', 'DEVICE_NOT_FOUND');
  }

  const normalizedPayload = normalizeDevicePayload(payload, { partial: true });

  if (normalizedPayload.deviceId) {
    await ensureUniqueDeviceId(normalizedPayload.deviceId, existingDevice._id);
  }

  if (Object.keys(normalizedPayload).length === 0) {
    throw new HttpError(400, 'No valid device fields were provided.', 'DEVICE_UPDATE_EMPTY');
  }

  await devicesCollection.updateOne(
    { _id: existingDevice._id },
    {
      $set: {
        ...normalizedPayload,
        updatedAt: new Date()
      }
    }
  );

  const updatedDevice = await devicesCollection.findOne({ _id: existingDevice._id });
  const serializedDevice = sanitizeDevice(updatedDevice);

  emitDeviceUpdated(serializedDevice);
  await emitStatsSnapshot();

  return serializedDevice;
}

// PUBLIC_INTERFACE
/**
 * Deletes an existing device and emits a realtime deletion update.
 *
 * @param {string} identifier - MongoDB id or deviceId.
 * @returns {Promise<object>} Sanitized deleted device payload.
 */
async function deleteDevice(identifier) {
  const devicesCollection = getDb().collection('devices');
  const existingDevice = await findDeviceDocument(identifier);

  if (!existingDevice) {
    throw new HttpError(404, 'Device was not found.', 'DEVICE_NOT_FOUND');
  }

  await devicesCollection.deleteOne({ _id: existingDevice._id });
  const serializedDevice = sanitizeDevice(existingDevice);

  emitDeviceDeleted(serializedDevice);
  await emitStatsSnapshot();

  return serializedDevice;
}

// PUBLIC_INTERFACE
/**
 * Triggers a device event manually and returns the persisted event plus device state.
 *
 * @param {string} identifier - MongoDB id or deviceId.
 * @param {object} payload - Event payload supplied by the caller.
 * @param {object|null} actor - Authenticated user triggering the event.
 * @returns {Promise<object>} Serialized event and updated device payload.
 */
async function triggerDeviceEvent(identifier, payload, actor) {
  const device = await findDeviceDocument(identifier);

  if (!device) {
    throw new HttpError(404, 'Device was not found.', 'DEVICE_NOT_FOUND');
  }

  const requestedEventType = payload.eventType ||
    (device.type === 'door' ? 'door_opened' : 'motion_detected');

  if (!EVENT_TYPES.includes(requestedEventType)) {
    throw new HttpError(400, 'Invalid event type.', 'DEVICE_EVENT_TYPE_INVALID');
  }

  validateEventTypeForDevice(device.type, requestedEventType);

  if (payload.severity && !EVENT_SEVERITIES.includes(payload.severity)) {
    throw new HttpError(400, 'Invalid event severity.', 'DEVICE_EVENT_SEVERITY_INVALID');
  }

  return createEventForDevice({
    device,
    eventType: requestedEventType,
    severity: payload.severity,
    message: payload.message,
    source: payload.source || 'manual-trigger',
    timestamp: payload.timestamp,
    forceSuspicious: payload.forceSuspicious === true,
    metadata: {
      ...(payload.metadata || {}),
      triggeredBy: actor ? actor.email : 'system'
    }
  });
}

module.exports = {
  listDevices,
  getDeviceByIdentifier,
  createDevice,
  updateDevice,
  deleteDevice,
  triggerDeviceEvent
};
