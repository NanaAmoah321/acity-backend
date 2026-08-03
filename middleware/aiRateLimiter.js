const {
  rateLimit,
  ipKeyGenerator
} = require("express-rate-limit");

const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,

  keyGenerator: (req) => {
    if (req.user?.id) {
      return `user:${req.user.id}`;
    }

    return ipKeyGenerator(req.ip);
  },

  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: "AI_RATE_LIMIT_EXCEEDED",
        message: "Too many AI requests. Please wait a minute and try again."
      }
    });
  }
});

module.exports = aiRateLimiter;