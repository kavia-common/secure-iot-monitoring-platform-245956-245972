const { ObjectId } = require('mongodb');
const { getDb } = require('../db/mongo');
const { HttpError } = require('../utils/errors');
const { extractBearerToken, verifyAccessToken } = require('../utils/security');
const { sanitizeUser } = require('../utils/serializers');

// PUBLIC_INTERFACE
/**
 * Authenticates the current request using a bearer JWT token.
 *
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {Promise<void>} Resolves when authentication succeeds.
 */
async function authenticateRequest(req, res, next) {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      throw new HttpError(401, 'Authorization token is required.', 'AUTH_TOKEN_MISSING');
    }

    const decodedToken = verifyAccessToken(token);
    const usersCollection = getDb().collection('users');

    let user = null;

    if (decodedToken.sub && ObjectId.isValid(decodedToken.sub)) {
      user = await usersCollection.findOne({
        _id: new ObjectId(decodedToken.sub)
      });
    }

    if (!user && decodedToken.email) {
      user = await usersCollection.findOne({
        email: String(decodedToken.email).trim().toLowerCase()
      });
    }

    if (!user) {
      throw new HttpError(401, 'Authenticated user could not be found.', 'AUTH_USER_NOT_FOUND');
    }

    if (user.status !== 'active') {
      throw new HttpError(403, 'This user account is not active.', 'AUTH_USER_INACTIVE');
    }

    req.user = sanitizeUser(user);
    req.auth = decodedToken;

    next();
  } catch (error) {
    if (error instanceof HttpError) {
      next(error);
      return;
    }

    next(new HttpError(401, 'Invalid or expired authorization token.', 'AUTH_TOKEN_INVALID'));
  }
}

// PUBLIC_INTERFACE
/**
 * Creates a role-based access control middleware for one or more user roles.
 *
 * @param {...string} allowedRoles - Roles allowed to access the protected route.
 * @returns {Function} Express middleware enforcing the supplied roles.
 */
function authorizeRoles(...allowedRoles) {
  return function roleAuthorizationMiddleware(req, res, next) {
    if (!req.user) {
      next(new HttpError(401, 'Authentication is required for this resource.', 'AUTH_REQUIRED'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new HttpError(403, 'You do not have access to this resource.', 'RBAC_FORBIDDEN'));
      return;
    }

    next();
  };
}

module.exports = {
  authenticateRequest,
  authorizeRoles
};
