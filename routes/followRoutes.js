const express = require("express");

const router = express.Router();

const authMiddleware =
require("../middleware/authMiddleware");

const followController =
require("../controllers/followController");
const { resourceLimiter } = require("../middleware/rateLimiters");

router.post(

    "/",

    authMiddleware,

    followController.toggleFollow

);

router.get(

    "/:userId",

    authMiddleware,

    resourceLimiter,

    followController.getFollowStatus

);

module.exports = router;