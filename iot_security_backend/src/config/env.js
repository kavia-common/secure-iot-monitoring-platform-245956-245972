require('dotenv').config();

function parseInteger(value, fallbackValue) {
  const parsedValue = Number.parseInt(value, 10);
  return Number.isFinite(parsedValue) ? parsedValue : fallbackValue;
}

function parseOrigins(value) {
  if (!value || value === '*') {
    return '*';
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function isDisabled(value) {
  return ['false', '0', 'no', 'off'].includes(String(value || '').trim().toLowerCase());
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  host: process.env.HOST || '0.0.0.0',
  port: parseInteger(process.env.PORT, 3001),
  mongodbUrl: process.env.MONGODB_URL,
  mongodbDb: process.env.MONGODB_DB,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  corsOrigin: parseOrigins(process.env.CORS_ORIGIN || '*'),
  socketCorsOrigin: parseOrigins(process.env.SOCKET_CORS_ORIGIN || process.env.CORS_ORIGIN || '*'),
  mockDeviceGeneratorEnabled: !isDisabled(process.env.MOCK_DEVICE_GENERATOR_ENABLED || 'true'),
  mockDeviceGeneratorIntervalMs: parseInteger(process.env.MOCK_DEVICE_GENERATOR_INTERVAL_MS, 12000),
  suspiciousWindowSeconds: parseInteger(process.env.SUSPICIOUS_WINDOW_SECONDS, 120),
  suspiciousEventThreshold: parseInteger(process.env.SUSPICIOUS_EVENT_THRESHOLD, 3)
};

// PUBLIC_INTERFACE
/**
 * Validates required environment variables for the backend runtime.
 *
 * @returns {void} Nothing when all required variables are present.
 * @throws {Error} When one or more required variables are missing.
 */
function assertRequiredConfig() {
  const requiredVariables = ['MONGODB_URL', 'MONGODB_DB', 'JWT_SECRET'];
  const missingVariables = requiredVariables.filter((key) => !process.env[key]);

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVariables.join(', ')}`
    );
  }
}

module.exports = {
  env,
  assertRequiredConfig
};
