const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authMiddleware = require("../middleware/authMiddleware");
const {
    authLimiter,
    resourceLimiter
} = require("../middleware/rateLimiters");

router.post("/register", authLimiter, authController.register);
router.post("/login", authLimiter, authController.login);
router.post("/google-preview",authLimiter, authController.googlePreview);
router.post("/google-register", authLimiter, authController.googleRegister);
router.post("/google", authLimiter, authController.googleLogin);
router.get("/profile", authMiddleware, authController.getProfile);
router.put(
    "/profile",
    authMiddleware,
    resourceLimiter,
    authController.updateProfile
);
router.delete(
    "/profile",
    authMiddleware,
    resourceLimiter,
    authController.deleteProfile
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