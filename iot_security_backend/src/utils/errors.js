// PUBLIC_INTERFACE
/**
 * Represents a structured HTTP error returned by the API.
 */
class HttpError extends Error {
  /**
   * Creates a new HTTP error instance.
   *
   * @param {number} statusCode - HTTP status code to return.
   * @param {string} message - Human-readable error message.
   * @param {string} [code='HTTP_ERROR'] - Stable machine-readable error code.
   * @param {object|null} [details=null] - Optional additional error details.
   */
  constructor(statusCode, message, code = 'HTTP_ERROR', details = null) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// PUBLIC_INTERFACE
/**
 * Wraps an async Express handler and forwards rejected promises to next().
 *
 * @param {Function} handler - Async Express route handler.
 * @returns {Function} Wrapped Express route handler.
 */
function asyncHandler(handler) {
  return function wrappedAsyncHandler(req, res, next) {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

module.exports = {
  HttpError,
  asyncHandler
};
