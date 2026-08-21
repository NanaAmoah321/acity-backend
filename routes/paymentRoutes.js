const express = require("express");

const router = express.Router();

const authMiddleware =
    require("../middleware/authMiddleware");

const paymentController =
    require("../controllers/paymentController");

router.post(
    "/initialize",
    authMiddleware,
    paymentController.initializePayment
);

router.get(
    "/verify",
    authMiddleware,
    paymentController.verifyPayment
);

module.exports = router;