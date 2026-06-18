const express = require("express");

const router = express.Router();

const authMiddleware =
require("../middleware/authMiddleware");

const messageController =
require("../controllers/messageController");

router.post(
    "/",
    authMiddleware,
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