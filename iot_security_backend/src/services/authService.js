const { ObjectId } = require('mongodb');
const { getDb } = require('../db/mongo');
const { HttpError } = require('../utils/errors');
const {
  hashPassword,
  verifyPassword,
  signAccessToken
} = require('../utils/security');
const { sanitizeUser } = require('../utils/serializers');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function buildUsernameBase(email, providedUsername) {
  if (providedUsername && String(providedUsername).trim()) {
    return String(providedUsername).trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  }

  return email.split('@')[0].replace(/[^a-z0-9_]/g, '') || 'user';
}

async function buildUniqueUsername(usersCollection, email, providedUsername) {
  const baseUsername = buildUsernameBase(email, providedUsername);
  let candidateUsername = baseUsername;
  let counter = 1;

  while (await usersCollection.findOne({ username: candidateUsername })) {
    candidateUsername = `${baseUsername}${counter}`;
    counter += 1;
  }

  return candidateUsername;
}

// PUBLIC_INTERFACE
/**
 * Registers a new standard user account and returns an access token.
 *
 * @param {object} payload - Registration payload containing name, email, and password.
 * @returns {Promise<{token: string, user: object}>} Authentication token and sanitized user.
 */
async function registerUser(payload) {
  const usersCollection = getDb().collection('users');
  const email = normalizeEmail(payload.email);
  const name = String(payload.name || '').trim();
  const password = String(payload.password || '');

  if (!name) {
    throw new HttpError(400, 'Name is required.', 'AUTH_NAME_REQUIRED');
  }

  if (!email || !isValidEmail(email)) {
    throw new HttpError(400, 'A valid email address is required.', 'AUTH_EMAIL_INVALID');
  }

  if (password.length < 6) {
    throw new HttpError(
      400,
      'Password must be at least 6 characters long.',
      'AUTH_PASSWORD_TOO_SHORT'
    );
  }

  const existingUser = await usersCollection.findOne({ email });

  if (existingUser) {
    throw new HttpError(409, 'An account with that email already exists.', 'AUTH_EMAIL_EXISTS');
  }

  const now = new Date();
  const userDocument = {
    email,
    username: await buildUniqueUsername(usersCollection, email, payload.username),
    name,
    role: 'user',
    status: 'active',
    password: await hashPassword(password),
    lastLoginAt: null,
    isSeedData: false,
    createdAt: now,
    updatedAt: now
  };

  const insertResult = await usersCollection.insertOne(userDocument);
  const createdUser = await usersCollection.findOne({ _id: insertResult.insertedId });

  return {
    token: signAccessToken(createdUser),
    user: sanitizeUser(createdUser)
  };
}

// PUBLIC_INTERFACE
/**
 * Authenticates a user with email and password and returns an access token.
 *
 * @param {object} payload - Login payload containing email and password.
 * @returns {Promise<{token: string, user: object}>} Authentication token and sanitized user.
 */
async function loginUser(payload) {
  const usersCollection = getDb().collection('users');
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || '');

  if (!email || !password) {
    throw new HttpError(
      400,
      'Both email and password are required.',
      'AUTH_CREDENTIALS_REQUIRED'
    );
  }

  const user = await usersCollection.findOne({ email });

  if (!user) {
    throw new HttpError(401, 'Invalid email or password.', 'AUTH_INVALID_CREDENTIALS');
  }

  if (user.status !== 'active') {
    throw new HttpError(403, 'This user account is disabled.', 'AUTH_USER_DISABLED');
  }

  const passwordMatches = await verifyPassword(password, user.password);

  if (!passwordMatches) {
    throw new HttpError(401, 'Invalid email or password.', 'AUTH_INVALID_CREDENTIALS');
  }

  const now = new Date();
  const updates = {
    lastLoginAt: now,
    updatedAt: now
  };

  if (user.password && !user.password.startsWith('$2') && password === user.password) {
    updates.password = await hashPassword(password);
  }

  await usersCollection.updateOne(
    { _id: user._id },
    { $set: updates }
  );

  const authenticatedUser = {
    ...user,
    ...updates
  };

  return {
    token: signAccessToken(authenticatedUser),
    user: sanitizeUser(authenticatedUser)
  };
}

// PUBLIC_INTERFACE
/**
 * Returns the current authenticated user profile by database identifier.
 *
 * @param {string} userId - MongoDB user identifier from the JWT subject claim.
 * @returns {Promise<object>} Sanitized authenticated user profile.
 */
async function getAuthenticatedUser(userId) {
  if (!ObjectId.isValid(userId)) {
    throw new HttpError(400, 'Invalid user identifier.', 'AUTH_USER_ID_INVALID');
  }

  const user = await getDb().collection('users').findOne({
    _id: new ObjectId(userId)
  });

  if (!user) {
    throw new HttpError(404, 'User profile could not be found.', 'AUTH_USER_NOT_FOUND');
  }

  return sanitizeUser(user);
}

module.exports = {
  registerUser,
  loginUser,
  getAuthenticatedUser
};
