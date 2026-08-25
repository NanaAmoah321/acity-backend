const express = require("express");

const router = express.Router();

const {
    resourceLimiter
} = require("../middleware/rateLimiters");

const listingController =
    require("../controllers/listingController");

const authMiddleware =
    require("../middleware/authMiddleware");

const adminMiddleware =
    require("../middleware/adminMiddleware");

const upload =
    require("../middleware/upload");


// ==========================================
// LISTINGS
// ==========================================

router.post(
    "/",
    authMiddleware,
    resourceLimiter,
    upload.single("image"),
    listingController.createListing
);

router.get(
    "/my",
    authMiddleware,
    listingController.getUserListings
);

router.get(
    "/search",
    listingController.searchListings
);

router.get(
    "/",
    listingController.getListings
);


// ==========================================
// STORES
// ==========================================

router.get(
    "/stores",
    listingController.getStores
);

router.get(
    "/store/:userId",
    listingController.getStore
);


// ==========================================
// ANALYTICS
// ==========================================

router.get(
    "/analytics/seller",
    authMiddleware,
    listingController.getSellerAnalytics
);


// ==========================================
// BUYER AND SELLER ORDERS
// ==========================================

router.get(
    "/seller-orders",
    authMiddleware,
    listingController.getSellerOrders
);

router.get(
    "/orders",
    authMiddleware,
    listingController.getBuyerOrders
);

router.get(
    "/orders/:id",
    authMiddleware,
    listingController.getOrderDetails
);

router.post(
    "/orders",
    authMiddleware,
    resourceLimiter,
    listingController.createOrder
);

router.put(
    "/orders/:id",
    authMiddleware,
    resourceLimiter,
    listingController.updateOrderStatus
);


// ==========================================
// CART
// ==========================================

router.post(
    "/interest",
    authMiddleware,
    resourceLimiter,
    listingController.addInterest
);

router.get(
    "/interested",
    authMiddleware,
    listingController.getInterestedListings
);

router.delete(
    "/cart/:listing_id",
    authMiddleware,
    resourceLimiter,
    listingController.removeFromCart
);

router.put(
    "/cart/:listing_id",
    authMiddleware,
    resourceLimiter,
    listingController.updateCartQuantity
);


// ==========================================
// LISTING ACTIONS
// ==========================================

router.put(
    "/:id/sold",
    authMiddleware,
    resourceLimiter,
    listingController.markListingSold
);

router.put(
    "/:id",
    authMiddleware,
    resourceLimiter,
    listingController.updateListing
);

router.delete(
    "/:id",
    authMiddleware,
    resourceLimiter,
    listingController.deleteListing
);

router.put(
    "/flag/:id",
    authMiddleware,
    adminMiddleware,
    listingController.flagListing
);

router.delete(
    "/admin/:id",
    authMiddleware,
    adminMiddleware,
    listingController.adminDeleteListing
);


// ==========================================
// SINGLE LISTING
// ==========================================

router.get(
    "/:id",
    listingController.getListingById
);


module.exports = router;