const express = require("express");

const router = express.Router();

const upload = require("../middleware/upload");

const authMiddleware =
require("../middleware/authMiddleware");

const messageController =
require("../controllers/messageController");
const { resourceLimiter } = require("../middleware/rateLimiters");

router.post(
    "/",
    authMiddleware,
    resourceLimiter,
    upload.single("attachment"),
    messageController.sendMessage
);

router.get(
    "/inbox",
    authMiddleware,
    messageController.getInbox
);

router.get(
    "/conversations",
    authMiddleware,
    messageController.getConversations
);

router.post(
    "/smart-replies",
    authMiddleware,
    resourceLimiter,
    messageController.getSmartReplies
);

router.get(
    "/conversation/:userId",
    authMiddleware,
    messageController.getConversation
);

router.get(
    "/unread-count",
    authMiddleware,
    messageController.getUnreadCount
);

module.exports = router;