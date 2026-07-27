/**
 * Request/response logger middleware. Logs method, path, status code,
 * and response time with ANSI color coding for readability.
 */
function requestLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    const color = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m';
    console.log(`[${time}] ${color}${res.statusCode}\x1b[0m | ${req.method} ${req.originalUrl} - ${ms}ms`);
  });
  next();
}

module.exports = requestLogger;