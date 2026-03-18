const express = require('express');
const statsController = require('../controllers/statsController');
const { authenticateRequest } = require('../middleware');

const router = express.Router();

/**
 * @swagger
 * /api/stats/overview:
 *   get:
 *     tags: [Statistics]
 *     summary: Get dashboard overview statistics
 *     description: Returns KPI summary cards, recent alerts, recent events, and chart datasets for the monitoring dashboard.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard overview payload.
 */
router.get('/overview', authenticateRequest, statsController.overview);

module.exports = router;
