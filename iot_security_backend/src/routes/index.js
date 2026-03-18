const express = require('express');
const healthController = require('../controllers/health');
const authRoutes = require('./auth');
const deviceRoutes = require('./devices');
const eventRoutes = require('./events');
const statsRoutes = require('./stats');
const realtimeRoutes = require('./realtime');

const router = express.Router();

/**
 * @swagger
 * /:
 *   get:
 *     tags: [System]
 *     summary: Health check
 *     description: Returns service readiness including database, realtime, and mock generator status.
 *     responses:
 *       200:
 *         description: Backend health snapshot.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
router.get('/', healthController.check);

router.use('/api/auth', authRoutes);
router.use('/api/devices', deviceRoutes);
router.use('/api/events', eventRoutes);
router.use('/api/stats', statsRoutes);
router.use('/api/realtime', realtimeRoutes);

module.exports = router;
