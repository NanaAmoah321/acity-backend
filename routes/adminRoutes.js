const express =
require("express");

const router =
express.Router();

const authMiddleware =
require("../middleware/authMiddleware");

const adminMiddleware =
require("../middleware/adminMiddleware");

const adminController =
require("../controllers/adminController");

router.get(
    "/stats",
    authMiddleware,
    adminMiddleware,
    adminController.getStats
);

router.get(
    "/listings",
    authMiddleware,
    adminMiddleware,
    adminController.getRecentListings
);

router.delete(
    "/listings/:id",
    authMiddleware,
    adminMiddleware,
    adminController.deleteListing
);

router.get(
    "/services",
    authMiddleware,
    adminMiddleware,
    adminController.getRecentServices
);

router.delete(
    "/services/:id",
    authMiddleware,
    adminMiddleware,
    adminController.deleteService
);

router.get(
    "/users",
    authMiddleware,
    adminMiddleware,
    adminController.getUsers
);

router.put(
    "/users/:id/admin",
    authMiddleware,
    adminMiddleware,
    adminController.makeAdmin
);

router.put(
    "/users/:id/suspend",
    authMiddleware,
    adminMiddleware,
    adminController.suspendUser
);

router.delete(
    "/users/:id",
    authMiddleware,
    adminMiddleware,
    adminController.deleteUser
);
module.exports = router;