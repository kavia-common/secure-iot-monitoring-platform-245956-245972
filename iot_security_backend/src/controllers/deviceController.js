const deviceService = require('../services/deviceService');
const { asyncHandler } = require('../utils/errors');

// PUBLIC_INTERFACE
/**
 * Returns a paginated list of devices with optional filters.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON device list response.
 */
const list = asyncHandler(async (req, res) => {
  const result = await deviceService.listDevices(req.query);

  return res.status(200).json({
    status: 'success',
    data: result
  });
});

// PUBLIC_INTERFACE
/**
 * Returns a single device by MongoDB id or stable deviceId.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON device response.
 */
const getById = asyncHandler(async (req, res) => {
  const device = await deviceService.getDeviceByIdentifier(req.params.id);

  return res.status(200).json({
    status: 'success',
    data: device
  });
});

// PUBLIC_INTERFACE
/**
 * Creates a new device record.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON created device response.
 */
const create = asyncHandler(async (req, res) => {
  const device = await deviceService.createDevice(req.body);

  return res.status(201).json({
    status: 'success',
    message: 'Device created successfully.',
    data: device
  });
});

// PUBLIC_INTERFACE
/**
 * Updates an existing device.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON updated device response.
 */
const update = asyncHandler(async (req, res) => {
  const device = await deviceService.updateDevice(req.params.id, req.body);

  return res.status(200).json({
    status: 'success',
    message: 'Device updated successfully.',
    data: device
  });
});

// PUBLIC_INTERFACE
/**
 * Deletes an existing device.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON deleted device response.
 */
const remove = asyncHandler(async (req, res) => {
  const device = await deviceService.deleteDevice(req.params.id);

  return res.status(200).json({
    status: 'success',
    message: 'Device deleted successfully.',
    data: device
  });
});

// PUBLIC_INTERFACE
/**
 * Creates a manual event for the selected device and returns the persisted event.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON trigger response.
 */
const trigger = asyncHandler(async (req, res) => {
  const result = await deviceService.triggerDeviceEvent(req.params.id, req.body, req.user);

  return res.status(201).json({
    status: 'success',
    message: 'Device event triggered successfully.',
    data: result
  });
});

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  trigger
};
