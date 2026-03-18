const { env } = require('../config/env');
const { getDb } = require('../db/mongo');
const { isRealtimeInitialized } = require('./realtimeService');
const { isMockDeviceGeneratorRunning } = require('./mockDeviceService');

// PUBLIC_INTERFACE
/**
 * Builds the current backend health snapshot for monitoring and Swagger docs.
 *
 * @returns {object} Health status payload containing environment and service readiness data.
 */
function getStatus() {
  let databaseStatus = 'disconnected';

  try {
    databaseStatus = `connected:${getDb().databaseName}`;
  } catch (error) {
    databaseStatus = 'disconnected';
  }

  return {
    status: 'ok',
    message: 'IoT Security Monitoring backend is healthy',
    timestamp: new Date().toISOString(),
    environment: env.nodeEnv,
    services: {
      database: databaseStatus,
      realtime: isRealtimeInitialized() ? 'ready' : 'not-ready',
      mockGenerator: isMockDeviceGeneratorRunning() ? 'running' : 'stopped'
    }
  };
}

module.exports = {
  getStatus
};
