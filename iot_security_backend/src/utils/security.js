const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { env } = require('../config/env');

// PUBLIC_INTERFACE
/**
 * Hashes a plaintext password for persistent storage.
 *
 * @param {string} password - Plaintext password supplied by the caller.
 * @returns {Promise<string>} The resulting bcrypt password hash.
 */
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

// PUBLIC_INTERFACE
/**
 * Validates a plaintext password against a stored credential.
 * Plaintext comparisons are supported to remain compatible with seeded demo data.
 *
 * @param {string} password - Plaintext password supplied by the caller.
 * @param {string} storedPassword - Stored password or bcrypt hash from the database.
 * @returns {Promise<boolean>} True when the password is valid, otherwise false.
 */
async function verifyPassword(password, storedPassword) {
  if (!storedPassword) {
    return false;
  }

  if (storedPassword.startsWith('$2')) {
    return bcrypt.compare(password, storedPassword);
  }

  return password === storedPassword;
}

function buildTokenPayload(user) {
  return {
    sub: user._id ? user._id.toString() : String(user.id),
    email: user.email,
    role: user.role,
    name: user.name
  };
}

// PUBLIC_INTERFACE
/**
 * Signs a JWT access token for an authenticated user.
 *
 * @param {object} user - User document containing identity and role information.
 * @returns {string} A signed JWT access token.
 */
function signAccessToken(user) {
  return jwt.sign(buildTokenPayload(user), env.jwtSecret, {
    expiresIn: env.jwtExpiresIn
  });
}

// PUBLIC_INTERFACE
/**
 * Verifies and decodes a JWT access token.
 *
 * @param {string} token - JWT access token to decode.
 * @returns {object} The decoded JWT payload.
 */
function verifyAccessToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

// PUBLIC_INTERFACE
/**
 * Extracts a bearer token from an Authorization header value.
 *
 * @param {string} authorizationHeader - Authorization header value.
 * @returns {string|null} The extracted bearer token when present, otherwise null.
 */
function extractBearerToken(authorizationHeader) {
  if (!authorizationHeader || typeof authorizationHeader !== 'string') {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token.trim();
}

module.exports = {
  hashPassword,
  verifyPassword,
  signAccessToken,
  verifyAccessToken,
  extractBearerToken
};
