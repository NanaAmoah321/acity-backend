const express = require("express");

const router = express.Router();

const buyerAiController = require("../controllers/buyerAiController");
const authMiddleware = require("../middleware/authMiddleware");
const aiRateLimiter = require("../middleware/aiRateLimiter");

router.post(
  "/buyer/search",
  authMiddleware,
  aiRateLimiter,
  buyerAiController.search
);

module.exports = router;