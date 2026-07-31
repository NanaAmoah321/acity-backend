const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const serviceController = require("../controllers/serviceController");
const { resourceLimiter } = require("../middleware/rateLimiters");

router.post(
  "/",
  authMiddleware,
  resourceLimiter,
  serviceController.createService
);

router.get(
  "/",
  serviceController.getServices
);

router.get(
  "/my",
  authMiddleware,
  serviceController.getMyServices
);

router.post(
  "/:id/requests",
  authMiddleware,
  resourceLimiter,
  serviceController.createServiceRequest
);

router.get(
    "/incoming",
    authMiddleware,
    serviceController.getIncomingServiceRequests
);

router.get(
  "/:id",
  serviceController.getServiceById
);

module.exports = router;