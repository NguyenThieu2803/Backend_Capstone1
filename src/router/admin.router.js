const express = require("express");
const authController = require("../controller/auth.controller");
const userController = require("../controller/User.controller");
const authmiddlewareControll = require("../middleware/auth.middleware");
const Adminrouter = express.Router();
const adminController = require("../controller/admin.controller");
const { upload, handleUploads } = require('../middleware/Upload/ProductUpload');
const awsUpload = require("../middleware/Upload/AWSmodel.update");
const { updateUpload, handleFileUpdates } = require('../middleware/Upload/Uploadedit');

// Product Management Routes
Adminrouter.get("/api/v1/product-stats", authmiddlewareControll.verifyUserandAdmin, adminController.getProductStats);
Adminrouter.post("/api/v1/addproduct", authmiddlewareControll.verifyUserandAdmin, upload, handleUploads, adminController.addProduct);
Adminrouter.get("/api/v1/products", authmiddlewareControll.verifyUserandAdmin, adminController.getAllProducts);
Adminrouter.get("/api/v1/product/:productId", authmiddlewareControll.verifyUserandAdmin, adminController.getProductById);
Adminrouter.put("/api/v1/editproduct/:productId", authmiddlewareControll.verifyUserandAdmin, updateUpload.fields([
    { name: 'images', maxCount: 5 },
    { name: 'model3d', maxCount: 1 }
]), handleFileUpdates, adminController.editProduct);
Adminrouter.delete("/api/v1/deleteproduct/:productId", authmiddlewareControll.verifyUserandAdmin, adminController.deleteProduct);
Adminrouter.put("/api/v1/updatestock/:productId", authmiddlewareControll.verifyUserandAdmin, adminController.updateStock);

// Order Management Routes
Adminrouter.get("/api/v1/order/:orderId", authmiddlewareControll.verifyUserandAdmin, adminController.getOrderById);
Adminrouter.get("/api/v1/allorders", authmiddlewareControll.verifyUserandAdmin, adminController.getAllOrders);
Adminrouter.put("/api/v1/updateorderstatus/", authmiddlewareControll.verifyUserandAdmin, adminController.updateOrderStatus);
Adminrouter.put("/api/v1/processreturnorrefund/", authmiddlewareControll.verifyUserandAdmin, adminController.processReturnOrRefund);
Adminrouter.get("/api/v1/orders/analytics", authmiddlewareControll.verifyUserandAdmin, adminController.getOrderAnalytics);
Adminrouter.get("/api/v1/orders/stats", authmiddlewareControll.verifyUserandAdmin, adminController.getOrderStats);
Adminrouter.get("/api/v1/orders/analytics", authmiddlewareControll.verifyUserandAdmin, adminController.getOrderAnalytics);
Adminrouter.get("/api/v1/orders/status-distribution", authmiddlewareControll.verifyUserandAdmin, adminController.getOrderStatusDistribution);
Adminrouter.get("/api/v1/orders/daily", authmiddlewareControll.verifyUserandAdmin, adminController.getDailyOrders);

// User Management Routes
Adminrouter.get("/api/v1/users", authmiddlewareControll.verifyUserandAdmin, adminController.getAllUsers);
Adminrouter.post("/api/v1/users", authmiddlewareControll.verifyUserandAdmin, adminController.addUser);
Adminrouter.put("/api/v1/users/:userId", authmiddlewareControll.verifyUserandAdmin, adminController.editUser);
Adminrouter.delete("/api/v1/users/:userId", authmiddlewareControll.verifyUserandAdmin, adminController.deleteUser);
Adminrouter.put("/api/v1/blockuser/:userId", authmiddlewareControll.verifyUserandAdmin, adminController.blockUser);
Adminrouter.put("/api/v1/unblockuser/:userId", authmiddlewareControll.verifyUserandAdmin, adminController.unblockUser);

// Inventory Management Routes
// router.get("/api/v1/inventory", authmiddlewareControll.verifyUserandAdmin, adminController.getInventory);
// router.put("/api/v1/inventory/update", authmiddlewareControll.verifyUserandAdmin, adminController.updateInventory);
// router.get("/api/v1/inventory/low-stock", authmiddlewareControll.verifyUserandAdmin, adminController.getLowStockProducts);

// Analytics and Dashboard Routes
Adminrouter.get("/api/v1/dashboard/stats", authmiddlewareControll.verifyUserandAdmin, adminController.getDashboardStats);
Adminrouter.get("/api/v1/sales/analytics", authmiddlewareControll.verifyUserandAdmin, adminController.getSalesAnalytics);
Adminrouter.get("/api/v1/sales/by-category", authmiddlewareControll.verifyUserandAdmin, adminController.getSalesByCategory);
Adminrouter.get("/api/v1/sales/by-month", authmiddlewareControll.verifyUserandAdmin, adminController.getSalesByMonth);
Adminrouter.get("/api/v1/sales/trend", authmiddlewareControll.verifyUserandAdmin, adminController.getSalesTrend);
Adminrouter.get("/api/v1/category/distribution", authmiddlewareControll.verifyUserandAdmin, adminController.getCategoryDistribution);

// User Statistics Route
Adminrouter.get("/api/v1/user/stats", authmiddlewareControll.verifyUserandAdmin, adminController.getUserStats);

// Category Management Routes
Adminrouter.get("/api/v1/categories", authmiddlewareControll.verifyUserandAdmin, adminController.getAllCategories);

// User Dashboard Routes
Adminrouter.get("/api/v1/users/dashboard", authmiddlewareControll.verifyUserandAdmin, adminController.getUsersDashboard);
Adminrouter.get("/api/v1/users/list", authmiddlewareControll.verifyUserandAdmin, adminController.getUsersList);
Adminrouter.post("/api/v1/users", authmiddlewareControll.verifyUserandAdmin, adminController.addUser);
Adminrouter.put("/api/v1/users/:userId", authmiddlewareControll.verifyUserandAdmin, adminController.editUser);
Adminrouter.delete("/api/v1/users/:userId", authmiddlewareControll.verifyUserandAdmin, adminController.deleteUser);

// SALES ROUTES
Adminrouter.get('/api/v1/sales-metrics', authmiddlewareControll.verifyUserandAdmin, adminController.getSalesMetrics);
Adminrouter.get('/api/v1/sales-overview', authmiddlewareControll.verifyUserandAdmin, adminController.getSalesOverview);
Adminrouter.get("/api/admin/sales-by-category", authmiddlewareControll.verifyUserandAdmin, adminController.getSalesByyCategory);
Adminrouter.get("/api/admin/daily-sales-trend", authmiddlewareControll.verifyUserandAdmin, adminController.getDailySalesTrend);
module.exports = Adminrouter;
