const express = require("express");
const authController = require("../controller/auth.controller");
const userController = require("../controller/User.controller");
const authmiddlewareControll = require("../middleware/auth.middleware");
const uploadCloud = require("../middleware/Uploader")
const router = express.Router();

router.get("/api/v1/", userController.getAllUsers);
router.get("/api/v1/getallproduct", userController.getAllProducts);
router.get("/api/v1/products/:id", userController.getProductById);
// cart routes
router.get("/api/v1/cart", authmiddlewareControll.verifyUser, userController.getAllCartbyUser);
router.post("/api/v1/cart", authmiddlewareControll.verifyUser, userController.addToCart);
router.delete("/api/v1/removecart/", authmiddlewareControll.verifyUser, userController.removeFromCart);
router.get("/api/v1/getallcart", userController.getAllCart);


//inventory routes
router.get("/api/v1/getallinventory", userController.getAllInventory);

// Wish List routes
router.post("/api/v1/addwishlist/", userController.addToWishlist);
router.get("/api/v1/wishlist/:id", userController.getWishlist);
router.delete("/api/v1/removewishlist/", userController.removeFromWishlist);
router.post("/api/v1/createReview", uploadCloud.array('image',5),userController.createReview);
router.get("/api/v1/getReviewByProduct/:productId", userController.getReviewsByProduct);
router.put("/api/v1/reviews/:reviewId", userController.updateReview);
router.get("/api/v1/getProductsByCategory/:categoryId", userController.getProductsByCategory);




// Order router

router.post("/api/v1/checkout", userController.CreateOrderController);
router.get("/api/v1/checkout", userController.UpdateOrderController);
router.put('/api/v1/checkout', userController.FindOrderController) 


module.exports = router;
