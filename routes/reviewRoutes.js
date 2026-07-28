const express =
require("express");

const router =
express.Router();

const authMiddleware =
require("../middleware/authMiddleware");

const reviewController =
require("../controllers/reviewController");
const { resourceLimiter } = require("../middleware/rateLimiters");

router.post(
    "/",
    authMiddleware,
    resourceLimiter,
    reviewController.createReview
);

router.get(
    "/:userId",
    reviewController.getReviews
);

router.get(
    "/rating/:userId",
    reviewController.getAverageRating
);

module.exports = router;