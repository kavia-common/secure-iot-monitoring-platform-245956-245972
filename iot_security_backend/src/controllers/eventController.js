const eventService = require('../services/eventService');
const deviceService = require('../services/deviceService');
const { asyncHandler } = require('../utils/errors');

// PUBLIC_INTERFACE
/**
 * Returns paginated event logs with optional filtering.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON event log response.
 */
const list = asyncHandler(async (req, res) => {
  const result = await eventService.listEvents(req.query);

  return res.status(200).json({
    status: 'success',
    data: result
  });
});

// PUBLIC_INTERFACE
/**
 * Creates a new event for a device using the generic events endpoint.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON created event response.
 */
const create = asyncHandler(async (req, res) => {
  const identifier = req.body.deviceId || req.body.deviceIdentifier || req.body.device;

  const result = await deviceService.triggerDeviceEvent(identifier, req.body, req.user);

  return res.status(201).json({
    status: 'success',
    message: 'Event created successfully.',
    data: result
  });
});

// PUBLIC_INTERFACE
/**
 * Returns a single event by MongoDB identifier.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON event response.
 */
const getById = asyncHandler(async (req, res) => {
  const event = await eventService.getEventById(req.params.id);

  return res.status(200).json({
    status: 'success',
    data: event
  });
});

// PUBLIC_INTERFACE
/**
 * Acknowledges an alert/event entry.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON acknowledged event response.
 */
const acknowledge = asyncHandler(async (req, res) => {
  const event = await eventService.acknowledgeEvent(req.params.id, req.user);

  return res.status(200).json({
    status: 'success',
    message: 'Event acknowledged successfully.',
    data: event
  });
});

module.exports = {
  list,
  create,
  getById,
  acknowledge
};
