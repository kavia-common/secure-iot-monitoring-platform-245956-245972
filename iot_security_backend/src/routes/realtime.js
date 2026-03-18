const express = require('express');
const realtimeController = require('../controllers/realtimeController');
const { authenticateRequest } = require('../middleware');

const router = express.Router();

/**
 * @swagger
 * /api/realtime/info:
 *   get:
 *     tags: [Realtime]
 *     summary: Get Socket.IO realtime usage information
 *     description: Returns the Socket.IO path, authentication notes, and broadcast channel names used by the realtime interface.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Realtime usage metadata.
 */
router.get('/info', authenticateRequest, realtimeController.getInfo);

module.exports = router;
