const express = require("express");
const authController = require("../controller/auth.controller");
const userController = require("../controller/User.controller");
const authmiddlewareControll = require("../middleware/auth.middleware");
const uploadCloud = require("../middleware/Uploader")
const router = express.Router();

router.get("/api/v1/", userController.getAllUsers);
router.get("/api/v1/getallproduct", userController.getAllProducts);
router.post("/api/v1/cart", userController.addToCart);
router.get("/api/v1/getallinventory", userController.getAllInventory);
router.get("/api/v1/products/:id", userController.getProductById);
router.post("/api/v1/addwishlist/", userController.addToWishlist);
router.get("/api/v1/wishlist/:id", userController.getWishlist);
router.delete("/api/v1/removecart/", userController.removeFromCart);
router.delete("/api/v1/removewishlist/", userController.removeFromWishlist);
router.post("/api/v1/createReview", uploadCloud.array('image',5),userController.createReview);
router.get("/api/v1/getReviewByProduct/:productId", userController.getReviewsByProduct);
router.put("/api/v1/reviews/:reviewId", userController.updateReview);
router.get("/api/v1/getProductsByCategory/:categoryId", userController.getProductsByCategory);







module.exports = router;
