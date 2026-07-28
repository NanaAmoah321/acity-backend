const express = require("express");
const router = express.Router();
const {
    resourceLimiter
} = require("../middleware/rateLimiters");

const listingController = require("../controllers/listingController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const upload = require("../middleware/upload");

router.post(
    "/",
    authMiddleware,
    resourceLimiter,
    upload.single("image"),
    listingController.createListing
);



router.get("/my", authMiddleware, listingController.getUserListings);
router.get("/search", listingController.searchListings);
router.get("/", listingController.getListings);
router.put(
    "/:id/sold",
    authMiddleware,
    resourceLimiter,
    listingController.markListingSold
);
router.put("/:id", authMiddleware,resourceLimiter, listingController.updateListing);
router.delete("/:id", authMiddleware, resourceLimiter,listingController.deleteListing);
router.post("/interest", authMiddleware,resourceLimiter, listingController.addInterest);
router.get("/interested", authMiddleware, listingController.getInterestedListings);
router.delete("/cart/:listing_id", authMiddleware,resourceLimiter, listingController.removeFromCart);
router.delete("/admin/:id", authMiddleware, adminMiddleware, listingController.adminDeleteListing);
router.put("/flag/:id", authMiddleware,adminMiddleware, listingController.flagListing);
router.get("/stores",listingController.getStores);
router.get("/store/:userId",listingController.getStore);
router.get("/seller-orders", authMiddleware, listingController.getSellerOrders);
router.put("/orders/:id",authMiddleware,resourceLimiter,listingController.updateOrderStatus);
router.get( "/:id", listingController.getListingById);
router.post("/orders",authMiddleware, resourceLimiter, listingController.createOrder);
router.put(
    "/cart/:listing_id",
    authMiddleware,
    resourceLimiter,
    listingController.updateCartQuantity
);

module.exports = router;