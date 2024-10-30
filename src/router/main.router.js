const express = require("express");
const authController = require("../controller/auth.controller");
const userController = require("../controller/User.controller");
const authmiddlewareControll = require("../middleware/auth.middleware");
const uploadCloud = require("../middleware/Uploader")
const router = express.Router();

// User routes
router.get("/api/v1/", userController.getAllUsers);
router.get("/api/v1/getallproduct", userController.getAllProducts);
router.get("/api/v1/products/:id", userController.getProductById);

// Cart routes
router.get("/api/v1/cart", authmiddlewareControll.verifyUser, userController.getAllCartbyUser);
router.post("/api/v1/cart", authmiddlewareControll.verifyUser, userController.addToCart);
router.put("/api/v1/cart", authmiddlewareControll.verifyUser, userController.updateCartItem);
router.delete("/api/v1/removecart/", authmiddlewareControll.verifyUser, userController.removeFromCart);
router.get("/api/v1/getallcart", userController.getAllCart);
router.delete("/api/v1/cart", authmiddlewareControll.verifyUser, userController.deleteCartItem);

// Inventory routes
router.get("/api/v1/getallinventory", userController.getAllInventory);
router.get("/api/v1/getinventorybyproductid", userController.GetInventoryByProductId);


// Wishlist routes
router.post("/api/v1/addwishlist/", userController.addToWishlist);
router.get("/api/v1/wishlist/:id", userController.getWishlist);
router.delete("/api/v1/removewishlist/", userController.removeFromWishlist);

//review
router.post("/api/v1/createReview", uploadCloud.array('image',5),userController.createReview);
router.get("/api/v1/getReviewByProduct/:productId", userController.getReviewsByProduct);
router.put("/api/v1/reviews/:reviewId", userController.updateReview);
router.get('/api/v1/getproductbycategory/:categoryId', userController.getProductsByCategory);
router.get("/api/v1/getAllCategories", userController.getAllCategories);


// Order routes
router.post("/api/v1/checkout", authmiddlewareControll.verifyUser, userController.checkout);
router.get("/api/v1/checkout", authmiddlewareControll.verifyUser, userController.UpdateOrderController);
router.put('/api/v1/checkout', authmiddlewareControll.verifyUser, userController.FindOrderController);

// Card routes
router.post("/api/v1/card", authmiddlewareControll.verifyUser, userController.addCard);
router.put("/api/v1/card/:cardId", authmiddlewareControll.verifyUser, userController.updateCard);
router.delete("/api/v1/card/:cardId", authmiddlewareControll.verifyUser, userController.deleteCard);
router.get("/api/v1/card", authmiddlewareControll.verifyUser, userController.getAllCards);

// Address routes
router.post("/api/v1/address", authmiddlewareControll.verifyUser, userController.addAddress);
router.put("/api/v1/address", authmiddlewareControll.verifyUser, userController.updateAddress);
router.delete("/api/v1/address", authmiddlewareControll.verifyUser, userController.deleteAddress);
router.get("/api/v1/address", authmiddlewareControll.verifyUser, userController.getAllAddresses);

module.exports = router;
