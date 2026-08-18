const express = require("express");

const router = express.Router();

const authMiddleware =
    require("../middleware/authMiddleware");

const {
    resourceLimiter
} = require("../middleware/rateLimiters");

const analyticsController =
    require("../controllers/analyticsController");

router.get(
    "/",
    authMiddleware,
    analyticsController.getAnalytics
);

router.put(
    "/budget",
    authMiddleware,
    resourceLimiter,
    analyticsController.updateBudget
);

module.exports = router;