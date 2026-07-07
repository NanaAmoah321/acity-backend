const express = require("express");

const router = express.Router();

const authMiddleware =
require("../middleware/authMiddleware");

const followController =
require("../controllers/followController");

router.post(

    "/",

    authMiddleware,

    followController.toggleFollow

);

router.get(

    "/:userId",

    authMiddleware,

    followController.getFollowStatus

);

module.exports = router;