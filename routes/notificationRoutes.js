const express = require("express");

const router = express.Router();

const authMiddleware =
require("../middleware/authMiddleware");

const notificationController =
require("../controllers/notificationController");
const { resourceLimiter } = require("../middleware/rateLimiters");

router.get(
    "/",
    authMiddleware,
    notificationController.getNotifications
);

router.get(
    "/unread-count",
    authMiddleware,
    notificationController.getUnreadCount
);

router.patch(

    "/read-all",

    authMiddleware,

    resourceLimiter,

    notificationController.markAllAsRead

);

router.patch(
    "/:id/read",
    authMiddleware,
    resourceLimiter,
    notificationController.markAsRead
);

module.exports = router;