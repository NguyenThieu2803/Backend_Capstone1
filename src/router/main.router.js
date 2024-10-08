const express = require("express");
const authController = require("../controller/auth.controller");
const userController = require("../controller/User.controller");
const authmiddlewareControll = require("../middleware/auth.middleware");
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




module.exports = router;
