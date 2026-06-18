const express =
require("express");

const router =
express.Router();

const authMiddleware =
require("../middleware/authMiddleware");

const notificationController =
require("../controllers/notificationController");

router.get(
    "/",
    authMiddleware,
    notificationController
    .getNotifications
);

module.exports = router;