const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const {
    authLimiter
} = require("../middleware/rateLimiters");

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.get("/profile", authMiddleware, authController.getProfile);
router.put(
    "/profile",
    authMiddleware,
    authController.updateProfile
);
router.post(
    "/forgot-password",
    authLimiter,
    authController.forgotPassword
);

router.post(
    "/reset-password/:token",
    authController.resetPassword
);
module.exports = router;