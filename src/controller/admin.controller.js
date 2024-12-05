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
const { uploadFileToS3 } = require('../middleware/Upload/AWSmodel.update'); // Import the upload function

const adminController = {
    // Add new product with inventory
    addProduct: async (req, res) => {
        try {
            console.log('Request body:', req.body); // Debug log
            console.log('Files:', req.files); // Debug log

            const {
                name,
                description,
                shortDescription,
                price,
                dimensions,
                stockQuantity,
                material,
                category,
                discount,
                brand,
                style,
                assemblyRequired,
                weight,
                images,
                model3d
            } = req.body;

            const newProduct = new Product({
                name,
                description,
                shortDescription,
                price: parseFloat(price),
                dimensions: dimensions ? JSON.parse(dimensions) : undefined,
                stockQuantity: parseInt(stockQuantity),
                material,
                images: images || [], // Provide default empty array
                model3d: model3d || '', // Provide default empty string
                category,
                discount: discount ? parseFloat(discount) : 0,
                brand,
                style,
                assemblyRequired: assemblyRequired === 'true',
                weight: weight ? parseFloat(weight) : undefined
            });

            console.log('New product data:', newProduct); // Debug log

            const savedProduct = await newProduct.save();
    
            const inventory = new Inventory({
                productId: savedProduct._id,
                name: savedProduct.name,
                stockQuantity: savedProduct.stockQuantity,
                price: savedProduct.price,
                category: savedProduct.category,
                brand: savedProduct.brand,
                material: savedProduct.material,
                color: savedProduct.color
            });
    
            await inventory.save();
    
            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                product: savedProduct,
                inventory
            });
        } catch (error) {
            console.error('Product creation error:', error); // Debug log
            res.status(500).json({
                success: false,
                message: 'Error adding product and inventory',
                error: error.message
            });
        }
    },

    // Update stock with inventory sync
    updateStock: async (req, res) => {
        try {
            const { productId } = req.params;
            const { stockQuantity } = req.body;

            // Update product stock
            const updatedProduct = await Product.findByIdAndUpdate(
                productId,
                { stockQuantity },
                { new: true, runValidators: true }
            );

            if (!updatedProduct) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Update inventory stock
            const updatedInventory = await Inventory.findOneAndUpdate(
                { productId: productId },
                { stockQuantity },
                { new: true }
            );

            res.status(200).json({
                success: true,
                message: 'Stock updated successfully',
                product: updatedProduct,
                inventory: updatedInventory
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating stock',
                error: error.message
            });
        }
    },

    // Edit product with inventory sync
    editProduct: async (req, res) => {
        try {
            const { productId } = req.body;
            const updateData = { ...req.body };
            delete updateData.productId;

            // Xử lý các trường đặc biệt
            if (updateData.dimensions) {
                updateData.dimensions = JSON.parse(updateData.dimensions);
            }
            if (updateData.color) {
                updateData.color = JSON.parse(updateData.color);
            }
            if (updateData.price) {
                updateData.price = parseFloat(updateData.price);
            }
            if (updateData.stockQuantity) {
                updateData.stockQuantity = parseInt(updateData.stockQuantity);
            }
            if (updateData.discount) {
                updateData.discount = parseFloat(updateData.discount);
            }
            if (updateData.weight) {
                updateData.weight = parseFloat(updateData.weight);
            }
            if (updateData.assemblyRequired) {
                updateData.assemblyRequired = updateData.assemblyRequired === 'true';
            }

            // Xử lý files upload
            if (req.files) {
                // Xử lý file ảnh mới
                if (req.files.images && req.files.images.length > 0) {
                    updateData.images = req.files.images.map(file => file.path || file.location);
                }

                // Xử lý file model 3D mới
                if (req.files.model3d && req.files.model3d.length > 0) {
                    updateData.model3d = req.files.model3d[0].location;
                }
            }

            // Cập nhật sản phẩm
            const updatedProduct = await Product.findByIdAndUpdate(
                productId,
                updateData,
                { new: true, runValidators: true }
            );

            if (!updatedProduct) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Cập nhật inventory
            const inventoryUpdate = {
                name: updateData.name,
                stockQuantity: updateData.stockQuantity,
                price: updateData.price,
                category: updateData.category,
                brand: updateData.brand,
                material: updateData.material,
                color: updateData.color
            };

            const updatedInventory = await Inventory.findOneAndUpdate(
                { productId: productId },
                inventoryUpdate,
                { new: true }
            );

            res.status(200).json({
                success: true,
                message: 'Product and inventory updated successfully',
                product: updatedProduct,
                inventory: updatedInventory
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating product and inventory',
                error: error.message
            });
        }
    },

    // Delete product with inventory
    deleteProduct: async (req, res) => {
        try {
            const { productId } = req.body;
            
            // Delete product
            const deletedProduct = await Product.findByIdAndDelete(productId);
            if (!deletedProduct) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Delete corresponding inventory
            await Inventory.findOneAndDelete({ productId: productId });

            res.status(200).json({
                success: true,
                message: 'Product and inventory deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error deleting product and inventory',
                error: error.message
            });
        }
    },
    getProductStats: async (req, res) => {
        try {
            // Total Products
            const totalProducts = await Product.countDocuments();
    
            // Top Selling Products
            const topSelling = await Product.find().sort({ sold: -1 }).limit(1);
            const topSellingCount = topSelling.length > 0 ? topSelling[0].sold : 0;
    
            // Low Stock Products
            const lowStockCount = await Product.countDocuments({ stockQuantity: { $lt: 10 } });
    
            // Total Revenue
            const totalRevenueResult = await Order.aggregate([
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$total_amount" }
                    }
                }
            ]);
            const totalRevenue = totalRevenueResult[0]?.totalRevenue || 0;
    
            res.status(200).json({
                success: true,
                stats: {
                    totalProducts,
                    topSelling: topSellingCount,
                    lowStock: lowStockCount,
                    totalRevenue: parseFloat(totalRevenue.toFixed(2))
                }
            });
    
        } catch (error) {
            console.error('Error fetching product stats:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching product stats',
                error: error.message
            });
        }
    },

    

    // Get Order by ID
    getOrderById: async (req, res) => {
        try {
            const { orderId } = req.params;
            const order = await Order.findById(orderId)
                .populate('userId', 'name email')
                .populate('products.productId');

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            res.status(200).json({
                success: true,
                order
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching order',
                error: error.message
            });
        }
    },

    // Get All Orders
    getAllOrders: async (req, res) => {
        try {
            // Fetch all orders from the database with correct field names
            const orders = await Order.find()
                .populate('user_id', 'user_name email') // Changed from userId to user_id
                .populate({
                    path: 'products.product',
                    select: 'name price images' // Added images field
                })
                .sort({ createdAt: -1 }); // Sort by creation date, newest first

            // Format the response data
            const formattedOrders = orders.map(order => ({
                id: order._id,
                user: order.user_id, // This will contain user_name and email
                products: order.products,
                totalAmount: order.total_amount,
                paymentStatus: order.payment_status,
                deliveryStatus: order.delivery_status,
                orderDate: order.createdAt,
                shippingAddress: order.shipping_address,
                paymentMethod: order.payment_method
            }));

            res.status(200).json({
                success: true,
                count: orders.length,
                data: formattedOrders,
                message: 'Orders retrieved successfully'
            });
        } catch (error) {
            console.error('Error fetching orders:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving orders',
                error: error.message
            });
        }
    },

    // Update Order Status
    updateOrderStatus: async (req, res) => {
        try {
            const { orderId, status } = req.body;

            // Validate status
            const validDeliveryStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
            if (!validDeliveryStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid delivery status'
                });
            }

            // Find and update the order
            const order = await Order.findById(orderId);
            
            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            // Update order status
            order.delivery_status = status;

            // If order is delivered, automatically update payment status
            if (status === 'Delivered') {
                order.payment_status = 'Completed';
            }

            // Save the updated order
            await order.save();

            // Populate user details for response
            await order.populate('user_id', 'name email');

            res.status(200).json({
                success: true,
                message: 'Order status updated successfully',
                data: {
                    orderId: order._id,
                    customerName: order.user_id.name,
                    status: order.delivery_status,
                    updatedAt: order.updatedAt
                }
            });

        } catch (error) {
            console.error('Error updating order status:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating order status',
                error: error.message
            });
        }
    },

    // Process Return or Refund
    processReturnOrRefund: async (req, res) => {
        try {
            const { orderId, action, reason } = req.body;
            const order = await Order.findById(orderId);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found'
                });
            }

            if (action === 'return') {
                order.returnStatus = 'approved';
                order.returnReason = reason;
            } else if (action === 'refund') {
                order.refundStatus = 'approved';
                order.refundReason = reason;
            }

            await order.save();

            res.status(200).json({
                success: true,
                message: `${action} processed successfully`,
                order
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error processing return/refund',
                error: error.message
            });
        }
    },

    // User Management
    getAllUsers: async (req, res) => {
        try {
            const { page = 1, limit = 10, search = '' } = req.query;
            const query = {};

            // Search by name or email
            if (search) {
                query.$or = [
                    { user_name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ];
            }

            const users = await User.find(query)
                .select('user_name email role isActive lastLogin')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit));

            const totalUsers = await User.countDocuments(query);

            res.status(200).json({
                success: true,
                data: {
                    users: users.map(user => ({
                        name: user.user_name,
                        email: user.email,
                        role: user.role,
                        status: user.isActive ? 'Active' : 'Inactive',
                        lastLogin: user.lastLogin
                    })),
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages: Math.ceil(totalUsers / limit),
                        totalUsers
                    }
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching users list',
                error: error.message
            });
        }
    },

    blockUser: async (req, res) => {
        try {
            const { userId } = req.params;
            const user = await User.findByIdAndUpdate(
                userId,
                { isBlocked: true },
                { new: true }
            ).select('-password');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'User blocked successfully',
                user
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error blocking user',
                error: error.message
            });
        }
    },

    unblockUser: async (req, res) => {
        try {
            const { userId } = req.params;
            const user = await User.findByIdAndUpdate(
                userId,
                { isBlocked: false },
                { new: true }
            ).select('-password');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'User unblocked successfully',
                user
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error unblocking user',
                error: error.message
            });
        }
    },

    // Get All Products
    getAllProducts: async (req, res) => {
        try {
            const { 
                page = 1, 
                limit = 5,
                search = '',
                category = '',
                sortBy = 'name',
                order = 'asc'
            } = req.query;

            // Build query
            const query = {};
            
            // Add search functionality
            if (search) {
                query.name = { $regex: search, $options: 'i' };
            }

            // Add category filter
            if (category) {
                query.category = category;
            }

            // Calculate skip for pagination
            const skip = (parseInt(page) - 1) * parseInt(limit);

            // Build sort object
            const sortOptions = {};
            sortOptions[sortBy] = order === 'asc' ? 1 : -1;

            // Get products with pagination and sorting
            const products = await Product.find(query)
                .select('name category price stockQuantity sold images')
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit));

            // Get total count for pagination
            const totalProducts = await Product.countDocuments(query);
            const totalPages = Math.ceil(totalProducts / limit);

            res.status(200).json({
                success: true,
                data: {
                    products: products.map(product => ({
                        id: product._id,
                        name: product.name,
                        category: product.category,
                        price: product.price,
                        stock: product.stockQuantity,
                        sales: product.sold,
                        image: product.images[0] || null
                    })),
                    pagination: {
                        currentPage: parseInt(page),
                        totalPages,
                        totalProducts,
                        hasNextPage: parseInt(page) < totalPages,
                        hasPrevPage: parseInt(page) > 1
                    }
                }
            });

        } catch (error) {
            console.error('Error fetching products:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching products',
                error: error.message
            });
        }
    },

    // Get Product by ID
    getProductById: async (req, res) => {
        try {
            const { productId } = req.params;
            const product = await Product.findById(productId)
                .populate('category');

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            res.status(200).json({
                success: true,
                product
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching product',
                error: error.message
            });
        }
    },







    // Get Order Analytics
    getOrderAnalytics: async (req, res) => {
        try {
            const currentDate = new Date();
            const lastMonth = new Date(currentDate.setMonth(currentDate.getMonth() - 1));

            const analytics = await Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: lastMonth }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        totalRevenue: { $sum: "$totalAmount" },
                        averageOrderValue: { $avg: "$totalAmount" },
                        completedOrders: {
                            $sum: {
                                $cond: [{ $eq: ["$status", "completed"] }, 1, 0]
                            }
                        },
                        pendingOrders: {
                            $sum: {
                                $cond: [{ $eq: ["$status", "pending"] }, 1, 0]
                            }
                        }
                    }
                }
            ]);

            // Get daily orders for the last 30 days
            const dailyOrders = await Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: lastMonth }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        orders: { $sum: 1 },
                        revenue: { $sum: "$totalAmount" }
                    }
                },
                {
                    $sort: { _id: 1 }
                }
            ]);

            res.status(200).json({
                success: true,
                analytics: analytics[0] || {
                    totalOrders: 0,
                    totalRevenue: 0,
                    averageOrderValue: 0,
                    completedOrders: 0,
                    pendingOrders: 0
                },
                dailyOrders
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching order analytics',
                error: error.message
            });
        }
    },

    // Get Dashboard Stats
    getDashboardStats: async (req, res) => {
        try {
            const totalProducts = await Product.countDocuments();
            const totalUsers = await User.countDocuments();
            const totalOrders = await Order.countDocuments();

            // Calculate total sales using the correct field name 'total_amount'
            const totalSalesResult = await Order.aggregate([
                {
                    $group: {
                        _id: null,
                        totalSales: { $sum: "$total_amount" }
                    }
                }
            ]);

            const totalSales = totalSalesResult[0]?.totalSales || 0;

            // Calculate conversion rate
            const conversionRate = totalUsers > 0 ? (totalOrders / totalUsers) * 100 : 0;

            res.status(200).json({
                success: true,
                stats: {
                    totalProducts,
                    totalUsers,
                    totalOrders,
                    totalSales,
                    conversionRate: parseFloat(conversionRate.toFixed(2)) // Conversion rate as a percentage
                }
            });
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching dashboard stats',
                error: error.message
            });
        }
    },

    // Get Sales Analytics
    getSalesAnalytics: async (req, res) => {
        try {
            const startDate = new Date(new Date().setMonth(new Date().getMonth() - 12));
            
            const monthlySales = await Order.aggregate([
                {
                    $match: {
                        createdAt: { $gte: startDate },
                        status: "completed"
                    }
                },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" }
                        },
                        totalSales: { $sum: "$totalAmount" },
                        orderCount: { $sum: 1 }
                    }
                },
                {
                    $sort: { "_id.year": 1, "_id.month": 1 }
                }
            ]);

            // Get top selling products
            const topProducts = await Order.aggregate([
                {
                    $unwind: "$products"
                },
                {
                    $group: {
                        _id: "$products.productId",
                        totalSold: { $sum: "$products.quantity" }
                    }
                },
                {
                    $sort: { totalSold: -1 }
                },
                {
                    $limit: 5
                }
            ]);

            res.status(200).json({
                success: true,
                monthlySales,
                topProducts
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error fetching sales analytics',
                error: error.message
            });
        }
    },

    getSalesByCategory: async (req, res) => {
        try {
            // Aggregate pipeline to get sales by category
            const salesByCategory = await Order.aggregate([
                // Only include completed orders
                { $match: { 
                    paymentStatus: "completed",
                    deliveryStatus: "delivered"
                }},
                // Unwind products array to work with individual products
                { $unwind: "$products" },
                // Lookup to get product details
                {
                    $lookup: {
                        from: "products",
                        localField: "products.product",
                        foreignField: "_id",
                        as: "productDetails"
                    }
                },
                // Unwind product details
                { $unwind: "$productDetails" },
                // Group by category
                {
                    $group: {
                        _id: "$productDetails.category",
                        totalSales: { $sum: "$products.amount" },
                        totalQuantity: { $sum: "$products.quantity" },
                        averageOrderValue: { $avg: "$products.amount" },
                        orders: { $addToSet: "$_id" }
                    }
                },
                // Lookup category details
                {
                    $lookup: {
                        from: "categories",
                        localField: "_id",
                        foreignField: "_id",
                        as: "categoryDetails"
                    }
                },
                // Unwind category details
                { $unwind: "$categoryDetails" },
                // Project final format
                {
                    $project: {
                        category: "$categoryDetails.name",
                        totalSales: { $round: ["$totalSales", 2] },
                        totalQuantity: 1,
                        averageOrderValue: { $round: ["$averageOrderValue", 2] },
                        numberOfOrders: { $size: "$orders" }
                    }
                },
                // Sort by total sales descending
                { $sort: { totalSales: -1 } }
            ]);

            // Calculate total sales across all categories
            const totalSales = salesByCategory.reduce((acc, curr) => acc + curr.totalSales, 0);

            // Add percentage of total sales to each category
            const salesWithPercentage = salesByCategory.map(category => ({
                ...category,
                percentageOfTotalSales: parseFloat(((category.totalSales / totalSales) * 100).toFixed(2))
            }));

            res.status(200).json({
                success: true,
                data: {
                    categories: salesWithPercentage,
                    totalSales,
                    totalCategories: salesWithPercentage.length
                },
                message: 'Sales by category retrieved successfully'
            });

        } catch (error) {
            console.error('Error getting sales by category:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving sales by category',
                error: error.message
            });
        }
    },

    getSalesByMonth: async (req, res) => {
        try {
            // Set the date range to include November 2024
            const endDate = new Date('2024-12-31');
            const startDate = new Date('2024-01-01');

            console.log('Date Range:', { startDate, endDate }); // Debug log

            const salesByMonth = await Order.aggregate([
                // Match orders within date range and completed status
                { 
                    $match: { 
                        payment_status: "Completed",
                        orderDate: {  
                            $gte: startDate, 
                            $lte: endDate 
                        }
                    }
                },
                // Convert orderDate string to Date object
                {
                    $addFields: {
                        order_date: { $toDate: "$orderDate" }
                    }
                },
                // Unwind products array
                { $unwind: "$products" },
                // Group by year and month
                {
                    $group: {
                        _id: {
                            year: { $year: "$orderDate" },
                            month: { $month: "$orderDate" }
                        },
                        totalSales: { $sum: "$totalAmount" },
                        totalQuantity: { $sum: "$products.quantity" },
                        orders: { $addToSet: "$_id" }
                    }
                },
                // Sort by year and month
                { $sort: { "_id.year": 1, "_id.month": 1 } },
                // Project the final output
                {
                    $project: {
                        year: "$_id.year",
                        month: "$_id.month",
                        totalSales: { $round: ["$totalSales", 2] },
                        totalQuantity: 1,
                        numberOfOrders: { $size: "$orders" },
                        _id: 0
                    }
                }
            ]);

            console.log('Aggregation Results:', salesByMonth); // Debug log

            const formattedSales = salesByMonth.map(month => ({
                monthYear: `${month.year}-${month.month.toString().padStart(2, '0')}`,
                totalSales: month.totalSales,
                totalQuantity: month.totalQuantity,
                numberOfOrders: month.numberOfOrders
            }));

            res.status(200).json({
                success: true,
                data: formattedSales,
                message: 'Sales by month retrieved successfully'
            });

        } catch (error) {
            console.error('Error getting sales by month:', error);
            res.status(500).json({
                success: false,
                message: 'Error retrieving sales by month',
                error: error.message
            });
        }
    },

    getOrderStats: async (req, res) => {
        try {
            // Get order statistics
            const orderStats = await Order.aggregate([
                {
                    $facet: {
                        // Total Orders
                        'totalOrders': [
                            { $count: 'count' }
                        ],
                        // Pending Orders
                        'pendingOrders': [
                            { 
                                $match: { 
                                    payment_status: 'Pending'
                                }
                            },
                            { $count: 'count' }
                        ],
                        // Completed Orders
                        'completedOrders': [
                            { 
                                $match: { 
                                    payment_status: 'Completed'
                                }
                            },
                            { $count: 'count' }
                        ],
                        // Total Revenue
                        'totalRevenue': [
                            {
                                $match: {
                                    payment_status: 'Completed'  // Only count completed orders for revenue
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: '$total_amount' }
                                }
                            }
                        ]
                    }
                }
            ]);

            // Extract values from aggregation results
            const stats = {
                totalOrders: orderStats[0].totalOrders[0]?.count || 0,
                pendingOrders: orderStats[0].pendingOrders[0]?.count || 0,
                completedOrders: orderStats[0].completedOrders[0]?.count || 0,
                totalRevenue: orderStats[0].totalRevenue[0]?.total || 0
            };

            res.status(200).json({
                success: true,
                stats: {
                    totalOrders: stats.totalOrders,
                    pendingOrders: stats.pendingOrders,
                    completedOrders: stats.completedOrders,
                    totalRevenue: parseFloat(stats.totalRevenue.toFixed(2))
                }
            });

        } catch (error) {
            console.error('Error fetching order stats:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching order stats',
                error: error.message
            });
        }
    },
    getOrderAnalytics: async (req, res) => {
        try {
            // Get daily orders for the past week
            const dailyOrders = await Order.aggregate([
                {
                    $match: {
                        order_date: {
                            $gte: new Date(new Date().setDate(new Date().getDate() - 7))
                        }
                    }
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$order_date" } },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { _id: 1 }
                }
            ]);
    
            // Get order status distribution
            const statusDistribution = await Order.aggregate([
                {
                    $group: {
                        _id: "$delivery_status",
                        count: { $sum: 1 }
                    }
                },
                {
                    $project: {
                        status: "$_id",
                        count: 1,
                        _id: 0
                    }
                }
            ]);
    
            // Calculate total orders for percentage
            const totalOrders = statusDistribution.reduce((acc, curr) => acc + curr.count, 0);
    
            // Add percentage to each status
            const statusWithPercentage = statusDistribution.map(status => ({
                ...status,
                percentage: ((status.count / totalOrders) * 100).toFixed(2)
            }));
    
            res.status(200).json({
                success: true,
                data: {
                    dailyOrders,
                    statusDistribution: statusWithPercentage
                }
            });
    
        } catch (error) {
            console.error('Error fetching order analytics:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching order analytics',
                error: error.message
            });
        }
    },
    getOrderList: async (req, res) => {
        try {
            const { page = 1, limit = 10 } = req.query;
            const orders = await Order.find()
                .populate('user_id', 'name') // Assuming 'name' is a field in User
                .sort({ order_date: -1 })
                .skip((page - 1) * limit)
                .limit(parseInt(limit));
    
            const totalOrders = await Order.countDocuments();
    
            res.status(200).json({
                success: true,
                data: orders,
                totalOrders,
                totalPages: Math.ceil(totalOrders / limit),
                currentPage: parseInt(page)
            });
        } catch (error) {
            console.error('Error fetching order list:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching order list',
                error: error.message
            });
        }
    },
    // Get Sales Trend
    getSalesTrend: async (req, res) => {
        try {
            const currentYear = new Date().getFullYear();
            const salesTrend = await Order.aggregate([
                {
                    $match: {
                        paymentStatus: "completed",
                        createdAt: {
                            $gte: new Date(currentYear, 0, 1) // Start of current year
                        }
                    }
                },
                {
                    $group: {
                        _id: {
                            month: { $month: "$createdAt" }
                        },
                        totalSales: { $sum: "$total_amount" },
                        count: { $sum: 1 }
                    }
                },
                {
                    $sort: { "_id.month": 1 }
                }
            ]);

            // Format data for chart
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const formattedData = months.map((month, index) => {
                const monthData = salesTrend.find(item => item._id.month === index + 1);
                return {
                    month,
                    sales: monthData ? monthData.totalSales : 0
                };
            });

            res.status(200).json({
                success: true,
                data: formattedData
            });

        } catch (error) {
            console.error('Error fetching sales trend:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching sales trend',
                error: error.message
            });
        }
    },

    // Get Category Distribution
    getCategoryDistribution: async (req, res) => {
        try {
            const categoryDistribution = await Product.aggregate([
                {
                    $group: {
                        _id: "$category",
                        count: { $sum: 1 },
                        totalSales: { $sum: "$sold" }
                    }
                },
                {
                    $project: {
                        category: "$_id",
                        count: 1,
                        totalSales: 1,
                        percentage: {
                            $multiply: [
                                { $divide: ["$count", { $sum: "$count" }] },
                                100
                            ]
                        }
                    }
                },
                { $sort: { totalSales: -1 } }
            ]);

            const totalProducts = await Product.countDocuments();

            const formattedData = categoryDistribution.map(cat => ({
                category: cat.category,
                percentage: Math.round(cat.percentage),
                count: cat.count,
                totalSales: cat.totalSales
            }));

            res.status(200).json({
                success: true,
                data: {
                    distribution: formattedData,
                    totalProducts
                }
            });

        } catch (error) {
            console.error('Error fetching category distribution:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching category distribution',
                error: error.message
            });
        }
    },

    getUserStats: async (req, res) => {
        try {
            // Get total users
            const totalUsers = await User.countDocuments();

            // Get new users today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const newUsersToday = await User.countDocuments({
                createdAt: {
                    $gte: today
                }
            });

            // Get active users (users who logged in within last 30 days)
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            const activeUsers = await User.countDocuments({
                lastLogin: {
                    $gte: thirtyDaysAgo
                }
            });

            // Calculate churn rate
            // Get users from last month
            const lastMonth = new Date();
            lastMonth.setMonth(lastMonth.getMonth() - 1);
            const usersLastMonth = await User.countDocuments({
                createdAt: {
                    $lte: lastMonth
                }
            });

            // Get inactive users (users who haven't logged in for 30 days)
            const inactiveUsers = await User.countDocuments({
                lastLogin: {
                    $lt: thirtyDaysAgo
                }
            });

            // Calculate churn rate
            const churnRate = usersLastMonth ? ((inactiveUsers / usersLastMonth) * 100).toFixed(1) : 0;

            res.status(200).json({
                success: true,
                data: {
                    totalUsers: totalUsers.toLocaleString(),
                    newUsersToday,
                    activeUsers: activeUsers.toLocaleString(),
                    churnRate: `${churnRate}%`
                }
            });

        } catch (error) {
            console.error('Error fetching user stats:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching user statistics',
                error: error.message
            });
        }
    },

    // Add New User
    addUser: async (req, res) => {
        try {
            const { user_name, email, password, role } = req.body;

            // Check if email already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Email already registered'
                });
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const newUser = new User({
                user_name,
                email,
                password: hashedPassword,
                role: role || 'Customer',
                isActive: true,
                lastLogin: new Date()
            });

            await newUser.save();

            res.status(201).json({
                success: true,
                message: 'User created successfully',
                user: {
                    name: newUser.user_name,
                    email: newUser.email,
                    role: newUser.role,
                    status: newUser.isActive ? 'Active' : 'Inactive'
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error creating user',
                error: error.message
            });
        }
    },

    // Edit User
    editUser: async (req, res) => {
        try {
            const { userId } = req.params;
            const { user_name, email, role, isActive } = req.body;

            const updatedUser = await User.findByIdAndUpdate(
                userId,
                {
                    user_name,
                    email,
                    role,
                    isActive
                },
                { new: true }
            ).select('-password');

            if (!updatedUser) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'User updated successfully',
                user: {
                    name: updatedUser.user_name,
                    email: updatedUser.email,
                    role: updatedUser.role,
                    status: updatedUser.isActive ? 'Active' : 'Inactive'
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error updating user',
                error: error.message
            });
        }
    },

    // Delete User
    deleteUser: async (req, res) => {
        try {
            const { userId } = req.params;
            const deletedUser = await User.findByIdAndDelete(userId);

            if (!deletedUser) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            res.status(200).json({
                success: true,
                message: 'User deleted successfully'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Error deleting user',
                error: error.message
            });
        }
    }
};

module.exports = adminController;
