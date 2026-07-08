const rateLimit = require("express-rate-limit");

// Global limiter
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too many requests from this IP. Please slow down."
    }
});

// Auth limiter
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
        error: "Too many login/registration attempts. Try again in 15 minutes."
    }
});

// Resource limiter
const resourceLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 15,
    keyGenerator: (req) =>
        req.user
            ? `user_${req.user.id}`
            : req.ip,
    message: {
        error: "You are doing that too fast. Please wait a moment."
    }
});

module.exports = {
    globalLimiter,
    authLimiter,
    resourceLimiter
};