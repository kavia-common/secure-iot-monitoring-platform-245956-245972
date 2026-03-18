const authService = require('../services/authService');
const { asyncHandler } = require('../utils/errors');

// PUBLIC_INTERFACE
/**
 * Registers a new platform user and returns a JWT plus user profile.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON auth response.
 */
const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);

  return res.status(201).json({
    status: 'success',
    message: 'User account created successfully.',
    data: result
  });
});

// PUBLIC_INTERFACE
/**
 * Authenticates a user with email and password and returns a JWT plus profile.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON auth response.
 */
const login = asyncHandler(async (req, res) => {
  const result = await authService.loginUser(req.body);

  return res.status(200).json({
    status: 'success',
    message: 'Authentication successful.',
    data: result
  });
});

// PUBLIC_INTERFACE
/**
 * Returns the currently authenticated user profile.
 *
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @returns {Promise<import('express').Response>} JSON user profile response.
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getAuthenticatedUser(req.user.id);

  return res.status(200).json({
    status: 'success',
    data: user
  });
});

module.exports = {
  register,
  login,
  getMe
};
