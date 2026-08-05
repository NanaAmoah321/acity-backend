const express = require("express");
const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const { resourceLimiter } = require("../middleware/rateLimiters");

const storeController = require("../controllers/storeController");

router.get(
    "/me",
    authMiddleware,
    storeController.getMyStore
);

router.post(
    "/",
    authMiddleware,
    resourceLimiter,
    upload.single("image"),
    storeController.createStore
);

module.exports = router;