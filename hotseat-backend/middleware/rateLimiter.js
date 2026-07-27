const rateLimit = require('express-rate-limit');

// General-purpose limiter applied to /api/ prefix
const generalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Take a breather." }
});

// Stricter limiter for sensitive endpoints (join, answer, upload)
const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Slow down a little!" }
});

// Very strict limiter for question suggestions (prevent spam)
const suggestionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You've dropped enough ideas for now! Try again in an hour." }
});

module.exports = { generalLimiter, strictLimiter, suggestionLimiter };