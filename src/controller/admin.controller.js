const User = require("../model/Usermodel/User");
const ShoppingCart = require("../model/Usermodel/ShoppingCart");
//const Notifications = require('../model/Usermodel/Notification')
const Product = require("../model/Usermodel/Product");
const authController = require("./auth.controller");
const Inventory = require("../model/Usermodel/Inventory");
const bcrypt = require("bcryptjs");
const Wishlist = require("../model/Usermodel/Wishlist"); // Import Wishlist model
const WishlistProduct = require("../model/Usermodel/Wishlist_product");
const Review = require("../model/Usermodel/Review");
const Category = require("../model/Usermodel/Category");
const multer = require("multer");
const path = require("path");
const { serviceAddToCart, ServiceGetallCartByUser, serviceUpdateCartItem, serviceDeleteCartItem } = require("../service/cart.service");
const orderService = require("../service/Order.service"); // Ensure correct import
const cardService = require("../service/Card.service"); // Ensure correct import
const addressService = require("../service/Address.service"); // Import address service
const { STRIPE_CONFIG } = require("../config/config");
const asyncHandler = require('express-async-handler');
const Order = require("../model/Usermodel/Order");

const adminController = {
    // Add a new product
    addProduct: asyncHandler(async (req, res) => {
        const fileData = req.files || [req.file];
        const images = fileData ? fileData.map((file) => file.path) : [];
        const { name, description, price, dimensions, stockQuantity, material, color, category, discount, promotionId, brand, style, assemblyRequired, weight } = req.body;

        const newProduct = new Product({
            name,
            description,
            price,
            dimensions,
            stockQuantity,
            material,
            color,
            images,
            category,
            discount,
            promotionId,
            brand,
            style,
            assemblyRequired,
            weight
        });

        await newProduct.save();
        res.status(201).json({ message: 'Product added successfully', product: newProduct });
    }),

    // Edit a product
    editProduct: asyncHandler(async (req, res) => {
        const { productId } = req.body;
        const updates = req.body;

        // Handle image updates
        const fileData = req.files || [req.file];
        if (fileData) {
            const images = fileData.map((file) => file.path);
            updates.images = images;
        }

        const updatedProduct = await Product.findByIdAndUpdate(productId, updates, { new: true });

        if (!updatedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json({ message: 'Product updated successfully', product: updatedProduct });
    }),

    // Delete a product
    deleteProduct: asyncHandler(async (req, res) => {
        const { productId } = req.params;

        const deletedProduct = await Product.findByIdAndDelete(productId);

        if (!deletedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.status(200).json({ message: 'Product deleted successfully' });
    }),

    // Update stock quantity
    updateStock: asyncHandler(async (req, res) => {
        const { productId } = req.params;
        const { stockQuantity } = req.body;

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        product.stockQuantity = stockQuantity;
        await product.save();

        res.status(200).json({ message: 'Stock updated successfully', product });
    }),
    
    // View all orders
    getAllOrders: asyncHandler(async (req, res) => {
        const orders = await Order.find().populate('user_id').populate('products.product').populate('shipping_address');
        res.status(200).json(orders);
    }),

     // View a specific order
     getOrderById: asyncHandler(async (req, res) => {
        const { orderId } = req.params;
        const order = await Order.findById(orderId).populate('user_id').populate('products.product').populate('shipping_address');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.status(200).json(order);
    }),

    // Update order status
    updateOrderStatus: asyncHandler(async (req, res) => {
        const { orderId } = req.body;
        const { status } = req.body;

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        order.delivery_status = status;
        await order.save();

        res.status(200).json({ message: 'Order status updated successfully', order });
    }),

    getTotalOrdersByUserId: asyncHandler(async (req, res) => {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }
        const orderByUser = await Order.find({ user_id: userId });
        const orderCount = orderByUser.length;

        res.status(200).json({ userId, orderByUser, orderCount });
    }),

    // Handle returns and refunds
    processReturnOrRefund: asyncHandler(async (req, res) => {
        const { orderId } = req.body;
        const { action } = req.body; // 'return' or 'refund'

        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        if (action === 'return') {
            order.delivery_status = 'Returned';
            // Additional logic for handling returns
        } else if (action === 'refund') {
            order.payment_status = 'Refunded';
            // Additional logic for processing refunds
        }

        await order.save();

        res.status(200).json({ message: `Order ${action} processed successfully`, order });
    }),

    // Get all users
    getAllUsers: asyncHandler(async (req, res) => {
        const users = await User.find();
        const userCount = users.length; // Get the count of users
        res.status(200).json({ users, userCount }); 
    }),

    // Block a user
    blockUser: asyncHandler(async (req, res) => {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isBlocked = true;
        await user.save();

        res.status(200).json({ message: 'User blocked successfully', user });
    }),

    // Unblock a user
    unblockUser: asyncHandler(async (req, res) => {
        const { userId } = req.params;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.isBlocked = false;
        await user.save();

        res.status(200).json({ message: 'User unblocked successfully', user });
    }),

   
};

module.exports = adminController;
