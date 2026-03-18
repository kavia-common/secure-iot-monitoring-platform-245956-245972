const express = require('express');
const eventController = require('../controllers/eventController');
const { authenticateRequest } = require('../middleware');

const router = express.Router();

/**
 * @swagger
 * /api/events:
 *   get:
 *     tags: [Events]
 *     summary: List event logs
 *     description: Returns event logs with filters for date range, device type, event type, severity, acknowledgement state, and suspicious-only mode.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *       - in: query
 *         name: deviceType
 *         schema:
 *           type: string
 *           enum: [motion, door]
 *       - in: query
 *         name: eventType
 *         schema:
 *           type: string
 *           enum: [motion_detected, door_opened, door_closed, heartbeat_missed, tamper_detected]
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [info, warning, critical]
 *       - in: query
 *         name: suspiciousOnly
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: acknowledged
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date-time
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date-time
 *     responses:
 *       200:
 *         description: Paginated event logs.
 *   post:
 *     tags: [Events]
 *     summary: Create a device event
 *     description: Creates an event for the specified device through the generic events endpoint and broadcasts the result in real time.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/EventCreateRequest'
 *     responses:
 *       201:
 *         description: Event created successfully.
 */
router.get('/', authenticateRequest, eventController.list);
router.post('/', authenticateRequest, eventController.create);

/**
 * @swagger
 * /api/events/{id}:
 *   get:
 *     tags: [Events]
 *     summary: Get a single event
 *     description: Returns a single persisted event by MongoDB identifier.
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
 *         description: Event details.
 *       404:
 *         description: Event not found.
 */
router.get('/:id', authenticateRequest, eventController.getById);

/**
 * @swagger
 * /api/events/{id}/acknowledge:
 *   post:
 *     tags: [Events]
 *     summary: Acknowledge an event
 *     description: Marks an event as acknowledged and broadcasts the updated status to all connected clients.
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
 *         description: Event acknowledged successfully.
 *       404:
 *         description: Event not found.
 */
router.post('/:id/acknowledge', authenticateRequest, eventController.acknowledge);

module.exports = router;
