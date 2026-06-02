/**
 * Wraps an async route handler so any rejected promise is forwarded to
 * Express's error middleware instead of crashing the process.
 *
 *   router.get('/', asyncHandler(async (req, res) => { ... }))
 */
module.exports = function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
};
