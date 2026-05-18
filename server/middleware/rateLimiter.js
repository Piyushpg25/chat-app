const rateLimit = require("express-rate-limit");
const { _max } = require("zod/v4/core");

// strict rule for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    message:
      "You can’t make more than 10 attempts in 15 minutes. Please wait a while!",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    message: "Too many requests! Please try again later.",
  },
});

module.exports = { authLimiter, apiLimiter };
