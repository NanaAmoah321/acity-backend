const express = require("express");

const authMiddleware = require("../middleware/authMiddleware");
const aiRateLimiter = require("../middleware/aiRateLimiter");
const { improveListingDraft } = require("../controllers/aiController");

const router = express.Router();

router.post(
  "/seller/improve-listing",
  authMiddleware,
  aiRateLimiter,
  improveListingDraft
);

module.exports = router;