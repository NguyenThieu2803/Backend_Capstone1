const express = require("express");
const authController = require("../controller/auth.controller");
const userController = require("../controller/User.controller");
const authmiddlewareControll = require("../middleware/auth.middleware");
const uploadCloud = require("../middleware/Uploader")
const router = express.Router();
const adminController = require("../controller/admin.controller");

router.post("/api/v1/addproduct", uploadCloud.array('image',5), adminController.addProduct);
router.put("/api/v1/editproduct/", uploadCloud.array('image',5), adminController.editProduct);
router.delete("/api/v1/deleteproduct/", adminController.deleteProduct);
router.put("/api/v1/updatestock/:productId", adminController.updateStock);

router.get("/api/v1/order/:orderId", adminController.getOrderById);
router.put("/api/v1/updateorderstatus/", adminController.updateOrderStatus);
router.put("/api/v1/processreturnorrefund/", adminController.processReturnOrRefund);
router.get("/api/v1/allorders", adminController.getAllOrders);

router.get("/api/v1/allusers", adminController.getAllUsers);
router.put("/api/v1/blockuser/:userId", adminController.blockUser);
router.put("/api/v1/unblockuser/:userId", adminController.unblockUser);

module.exports = router;
