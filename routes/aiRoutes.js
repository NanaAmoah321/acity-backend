const express = require("express");

const authMiddleware =
require("../middleware/authMiddleware");

const aiRateLimiter =
require("../middleware/aiRateLimiter");

const {

    improveListingDraft,

    improveMessageController

} = require("../controllers/aiController");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Seller Agent
|--------------------------------------------------------------------------
*/

router.post(

    "/seller/improve-listing",

    authMiddleware,

    aiRateLimiter,

    improveListingDraft

);

/*
|--------------------------------------------------------------------------
| Message Agent
|--------------------------------------------------------------------------
*/

router.post(

    "/messages/improve",

    authMiddleware,

    aiRateLimiter,

    improveMessageController

);

module.exports = router;