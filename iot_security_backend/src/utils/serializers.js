function toId(value) {
  return value ? value.toString() : null;
}

function serializeDate(value) {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : value;
}

// PUBLIC_INTERFACE
/**
 * Removes internal-only fields from a user document before returning it to clients.
 *
 * @param {object|null} user - Raw MongoDB user document.
 * @returns {object|null} Sanitized user payload safe for API responses.
 */
function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const id = toId(user._id || user.id);

  return {
    id,
    _id: id,
    email: user.email,
    username: user.username || null,
    name: user.name,
    role: user.role,
    status: user.status,
    lastLoginAt: serializeDate(user.lastLoginAt),
    createdAt: serializeDate(user.createdAt),
    updatedAt: serializeDate(user.updatedAt)
  };
}

// PUBLIC_INTERFACE
/**
 * Converts a raw device document into the API response shape expected by clients.
 *
 * @param {object|null} device - Raw MongoDB device document.
 * @returns {object|null} Sanitized device response payload.
 */
function sanitizeDevice(device) {
  if (!device) {
    return null;
  }

  const id = toId(device._id || device.id);

  return {
    id,
    _id: id,
    deviceId: device.deviceId,
    name: device.name,
    type: device.type,
    location: device.location,
    status: device.status,
    batteryLevel: device.batteryLevel ?? null,
    firmwareVersion: device.firmwareVersion || null,
    ipAddress: device.ipAddress || null,
    lastSeenAt: serializeDate(device.lastSeenAt),
    createdAt: serializeDate(device.createdAt),
    updatedAt: serializeDate(device.updatedAt)
  };
}

// PUBLIC_INTERFACE
/**
 * Converts a raw event document into the API response shape expected by clients.
 *
 * @param {object|null} event - Raw MongoDB event document.
 * @returns {object|null} Sanitized event response payload.
 */
function sanitizeEvent(event) {
  if (!event) {
    return null;
  }

  const id = toId(event._id || event.id);

  return {
    id,
    _id: id,
    deviceId: event.deviceId,
    deviceName: event.deviceName,
    deviceType: event.deviceType,
    location: event.location,
    eventType: event.eventType,
    severity: event.severity,
    suspicious: Boolean(event.suspicious),
    source: event.source,
    message: event.message,
    acknowledged: Boolean(event.acknowledged),
    acknowledgedAt: serializeDate(event.acknowledgedAt),
    metadata: event.metadata || {},
    timestamp: serializeDate(event.timestamp),
    createdAt: serializeDate(event.createdAt),
    updatedAt: serializeDate(event.updatedAt)
  };
}

// PUBLIC_INTERFACE
/**
 * Builds a paginated API response envelope.
 *
 * @param {Array} items - List of serialized response items.
 * @param {number} page - Current page number.
 * @param {number} limit - Page size.
 * @param {number} total - Total result count.
 * @returns {object} Paginated response object.
 */
function buildPaginatedResponse(items, page, limit, total) {
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    }
  };
}

// PUBLIC_INTERFACE
/**
 * Parses a positive integer from query parameters while applying a fallback.
 *
 * @param {string|number|undefined} value - User-supplied numeric value.
 * @param {number} fallbackValue - Fallback number to use when parsing fails.
 * @returns {number} Parsed positive integer or fallback value.
 */
function parsePositiveInteger(value, fallbackValue) {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallbackValue;
  }

  return parsedValue;
}

// PUBLIC_INTERFACE
/**
 * Parses a boolean-like query parameter into a real boolean.
 *
 * @param {string|boolean|undefined} value - User-supplied boolean-like value.
 * @returns {boolean|undefined} Parsed boolean or undefined when not provided/invalid.
 */
function parseBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (['true', '1', 'yes'].includes(normalizedValue)) {
    return true;
  }

  if (['false', '0', 'no'].includes(normalizedValue)) {
    return false;
  }

  return undefined;
}

module.exports = {
  sanitizeUser,
  sanitizeDevice,
  sanitizeEvent,
  buildPaginatedResponse,
  parsePositiveInteger,
  parseBoolean
};
