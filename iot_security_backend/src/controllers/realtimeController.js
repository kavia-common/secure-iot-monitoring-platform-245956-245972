const { getRealtimeInfo } = require('../services/realtimeService');

// PUBLIC_INTERFACE
/**
 * Returns connection guidance for the Socket.IO realtime interface.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {import('express').Response} JSON realtime usage response.
 */
function getInfo(req, res) {
  return res.status(200).json({
    status: 'success',
    data: getRealtimeInfo()
  });
}

module.exports = {
  getInfo
};
