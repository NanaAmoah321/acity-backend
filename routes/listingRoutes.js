const express = require("express");
const router = express.Router();

const listingController = require("../controllers/listingController");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");


router.post("/", authMiddleware, listingController.createListing);
router.get("/my", authMiddleware, listingController.getUserListings);
router.get("/", listingController.getListings);
router.put("/:id", authMiddleware, listingController.updateListing);
router.delete("/:id", authMiddleware, listingController.deleteListing);
router.post("/interest", authMiddleware, listingController.addInterest);
router.get("/interested", authMiddleware, listingController.getInterestedListings);
router.delete("/cart/:listing_id", authMiddleware, listingController.removeFromCart);
router.delete("/admin/:id", authMiddleware, adminMiddleware, listingController.adminDeleteListing);
router.put("/flag/:id", authMiddleware,adminMiddleware, listingController.flagListing);

module.exports = router;