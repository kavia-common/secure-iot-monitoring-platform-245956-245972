const healthService = require('../services/health');

// PUBLIC_INTERFACE
/**
 * Returns the service health snapshot for uptime and readiness monitoring.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {import('express').Response} JSON health payload.
 */
function check(req, res) {
  return res.status(200).json(healthService.getStatus());
}

module.exports = {
  check
};
