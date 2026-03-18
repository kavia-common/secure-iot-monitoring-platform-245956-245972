const { HttpError } = require('../utils/errors');

// PUBLIC_INTERFACE
/**
 * Creates a standardized 404 error when no route matches the incoming request.
 *
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {void} Forwards a not-found error to the global error handler.
 */
function notFoundHandler(req, res, next) {
  next(
    new HttpError(
      404,
      `Route ${req.method} ${req.originalUrl} was not found.`,
      'ROUTE_NOT_FOUND'
    )
  );
}

// PUBLIC_INTERFACE
/**
 * Converts application errors into a consistent JSON response envelope.
 *
 * @param {Error} error - Application or runtime error.
 * @param {import('express').Request} req - Express request.
 * @param {import('express').Response} res - Express response.
 * @param {import('express').NextFunction} next - Express next function.
 * @returns {void} Sends the JSON error response to the client.
 */
function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    next(error);
    return;
  }

  const statusCode = error.statusCode || 500;
  const errorCode = error.code || 'INTERNAL_SERVER_ERROR';

  if (statusCode >= 500) {
    console.error('Unhandled server error:', error);
  }

  res.status(statusCode).json({
    status: 'error',
    message: error.message || 'Internal Server Error',
    code: errorCode,
    details: error.details || null
  });
}

module.exports = {
  notFoundHandler,
  errorHandler
};
