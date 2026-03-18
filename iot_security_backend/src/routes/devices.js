const express = require('express');
const deviceController = require('../controllers/deviceController');
const { authenticateRequest, authorizeRoles } = require('../middleware');

const router = express.Router();

/**
 * @swagger
 * /api/devices:
 *   get:
 *     tags: [Devices]
 *     summary: List devices
 *     description: Returns devices with optional type, status, location, and search filters.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [motion, door]
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [online, offline, maintenance, alert]
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Paginated device list.
 *   post:
 *     tags: [Devices]
 *     summary: Create a device
 *     description: Creates a new IoT device. This route is restricted to administrators.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeviceInput'
 *     responses:
 *       201:
 *         description: Device created successfully.
 *       403:
 *         description: Admin role required.
 */
router.get('/', authenticateRequest, deviceController.list);
router.post(
  '/',
  authenticateRequest,
  authorizeRoles('admin'),
  deviceController.create
);

/**
 * @swagger
 * /api/devices/{id}:
 *   get:
 *     tags: [Devices]
 *     summary: Get a single device
 *     description: Returns a device by MongoDB id or stable deviceId.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device details.
 *       404:
 *         description: Device not found.
 *   put:
 *     tags: [Devices]
 *     summary: Update a device
 *     description: Updates device properties. This route is restricted to administrators.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/DeviceUpdateInput'
 *     responses:
 *       200:
 *         description: Device updated successfully.
 *       403:
 *         description: Admin role required.
 *   delete:
 *     tags: [Devices]
 *     summary: Delete a device
 *     description: Removes a device from the platform. This route is restricted to administrators.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Device deleted successfully.
 *       403:
 *         description: Admin role required.
 */
router.get('/:id', authenticateRequest, deviceController.getById);
router.put(
  '/:id',
  authenticateRequest,
  authorizeRoles('admin'),
  deviceController.update
);
router.delete(
  '/:id',
  authenticateRequest,
  authorizeRoles('admin'),
  deviceController.remove
);

/**
 * @swagger
 * /api/devices/{id}/trigger:
 *   post:
 *     tags: [Devices]
 *     summary: Manually trigger a device event
 *     description: Simulates a motion or door event, persists it, runs suspicious detection, and broadcasts the result in real time.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventTriggerRequest'
 *     responses:
 *       201:
 *         description: Event created and broadcast successfully.
 *       404:
 *         description: Device not found.
 */
router.post('/:id/trigger', authenticateRequest, deviceController.trigger);

module.exports = router;
