/**
 * Central error-handling middleware. Every thrown/forwarded error ends up here,
 * giving the API a single, consistent error response shape:
 *
 *   { "error": { "message": "...", "details": ... } }
 */
const ApiError = require('../utils/ApiError');

// 404 for unmatched routes.
function notFoundHandler(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  // Translate a couple of common MySQL errors into clean HTTP responses.
  if (err && err.code === 'ER_DUP_ENTRY') {
    err = ApiError.conflict('A record with that value already exists');
  }
  if (err && err.code === 'ER_NO_REFERENCED_ROW_2') {
    err = ApiError.badRequest('Referenced record does not exist (invalid assigned_to)');
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  if (!err.isOperational) {
    // Unexpected error — log the full stack for debugging.
    console.error('[UNHANDLED ERROR]', err);
  }

  res.status(statusCode).json({
    error: {
      message,
      ...(err.details ? { details: err.details } : {}),
    },
  });
}

module.exports = { notFoundHandler, errorHandler };
