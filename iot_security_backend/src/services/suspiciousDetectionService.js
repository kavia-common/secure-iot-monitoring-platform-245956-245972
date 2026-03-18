const { getDb } = require('../db/mongo');
const { env } = require('../config/env');

// PUBLIC_INTERFACE
/**
 * Evaluates whether a new device event should be marked as suspicious.
 *
 * @param {string} deviceId - Stable device identifier associated with the new event.
 * @param {Date} eventTimestamp - Timestamp for the incoming event.
 * @param {string} eventType - Event type being evaluated.
 * @returns {Promise<object>} Detection result with suspicious flag and supporting metadata.
 */
async function evaluateSuspiciousActivity(deviceId, eventTimestamp, eventType) {
  const windowStart = new Date(
    eventTimestamp.getTime() - (env.suspiciousWindowSeconds * 1000)
  );

  const recentEventCount = await getDb().collection('events').countDocuments({
    deviceId,
    timestamp: {
      $gte: windowStart,
      $lte: eventTimestamp
    }
  });

  const triggerCountLastWindow = recentEventCount + 1;
  const suspicious =
    eventType === 'tamper_detected' ||
    triggerCountLastWindow >= env.suspiciousEventThreshold;

  let reason = 'Event volume is within the expected threshold.';

  if (eventType === 'tamper_detected') {
    reason = 'Tamper detections are always treated as suspicious.';
  } else if (suspicious) {
    reason =
      `Detected ${triggerCountLastWindow} events for device ${deviceId} ` +
      `within ${env.suspiciousWindowSeconds} seconds.`;
  }

  return {
    suspicious,
    reason,
    triggerCountLastWindow,
    windowSeconds: env.suspiciousWindowSeconds,
    threshold: env.suspiciousEventThreshold
  };
}

module.exports = {
  evaluateSuspiciousActivity
};
