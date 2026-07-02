const express = require("express");
const router = express.Router();

const listingController = require("../controllers/listingController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const upload = require("../middleware/upload");

router.post(
    "/",
    authMiddleware,
    upload.single("image"),
    listingController.createListing
);



router.get("/my", authMiddleware, listingController.getUserListings);
router.get("/search", listingController.searchListings);
router.get("/", listingController.getListings);
router.put(
    "/:id/sold",
    authMiddleware,
    listingController.markListingSold
);
router.put("/:id", authMiddleware, listingController.updateListing);
router.delete("/:id", authMiddleware, listingController.deleteListing);
router.post("/interest", authMiddleware, listingController.addInterest);
router.get("/interested", authMiddleware, listingController.getInterestedListings);
router.delete("/cart/:listing_id", authMiddleware, listingController.removeFromCart);
router.delete("/admin/:id", authMiddleware, adminMiddleware, listingController.adminDeleteListing);
router.put("/flag/:id", authMiddleware,adminMiddleware, listingController.flagListing);
router.get("/stores",listingController.getStores);
router.get("/store/:userId",listingController.getStore);
router.get("/seller-orders", authMiddleware, listingController.getSellerOrders);
router.put("/orders/:id",authMiddleware,listingController.updateOrderStatus);
router.get( "/:id", listingController.getListingById);
router.post("/orders",authMiddleware, listingController.createOrder);
router.put(
    "/cart/:listing_id",
    authMiddleware,
    listingController.updateCartQuantity
);

module.exports = router;