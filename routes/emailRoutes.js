const express = require("express");

const router = express.Router();

const emailController =
require("../controllers/emailController");

router.get(

    "/unsubscribe/:token",

    emailController.unsubscribe

);

module.exports = router;