const { asyncHandler } = require('../utils/errors');
const { getStatsOverview } = require('../services/statsService');

// PUBLIC_INTERFACE
/**
 * Returns the dashboard overview payload with summary metrics and chart datasets.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON stats overview response.
 */
const overview = asyncHandler(async (req, res) => {
  const stats = await getStatsOverview();

  return res.status(200).json({
    status: 'success',
    data: stats
  });
});

module.exports = {
  overview
};
