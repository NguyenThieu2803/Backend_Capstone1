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
const orderService = require("../service/order.service"); // Ensure correct import
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
                model3d,
                sales
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
                weight: weight ? parseFloat(weight) : undefined,
                sales: parseInt(sales) || 0
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
            const { productId } = req.params;
            const updateData = { ...req.body };

            // Validate product existence
            const existingProduct = await Product.findById(productId);
            if (!existingProduct) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Process special fields
            if (updateData.dimensions) {
                updateData.dimensions = JSON.parse(updateData.dimensions);
            }
            if (updateData.price) updateData.price = parseFloat(updateData.price);
            if (updateData.stockQuantity) updateData.stockQuantity = parseInt(updateData.stockQuantity);
            if (updateData.discount) updateData.discount = parseFloat(updateData.discount);
            if (updateData.weight) updateData.weight = parseFloat(updateData.weight);
            if (updateData.assemblyRequired) {
                updateData.assemblyRequired = updateData.assemblyRequired === 'true';
            }

            // Handle file uploads
            if (req.files) {
                if (req.files.images?.length > 0) {
                    updateData.images = [...existingProduct.images];
                    const newImages = req.files.images.map(file => file.path || file.location);
                    updateData.images.push(...newImages);
                }
                if (req.files.model3d?.length > 0) {
                    updateData.model3d = req.files.model3d[0].location;
                }
            }

            // Update product
            const updatedProduct = await Product.findByIdAndUpdate(
                productId,
                { $set: updateData },
                { new: true, runValidators: true }
            );

            // Update inventory
            const inventoryUpdate = {
                name: updateData.name,
                stockQuantity: updateData.stockQuantity,
                price: updateData.price,
                category: updateData.category,
                brand: updateData.brand,
                material: updateData.material
            };

            const updatedInventory = await Inventory.findOneAndUpdate(
                { productId: productId },
                inventoryUpdate,
                { new: true }
            );

            // Get category information
            const categoryInfo = await Category.findOne({ name: updatedProduct.category }).lean();

            res.status(200).json({
                success: true,
                message: 'Product updated successfully',
                data: {
                    ...updatedProduct.toObject(),
                    categoryInfo: categoryInfo || { name: updatedProduct.category },
                    inventoryInfo: updatedInventory
                }
            });

        } catch (error) {
            console.error('Error updating product:', error);
            res.status(500).json({
                success: false,
                message: 'Error updating product',
                error: error.message
            });
        }
    },

    // Delete product with inventory
    deleteProduct: async (req, res) => {
        try {
            const { productId } = req.params;

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
            console.error('Error deleting product:', error);
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
            const totalRevenueResult = await Product.aggregate([
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$price" }
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
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            // Get total orders count first
            const totalOrders = await Order.countDocuments();

            // Fetch paginated orders
            const orders = await Order.find()
                .populate('user_id', 'user_name email')
                .populate({
                    path: 'products.product',
                    select: 'name price images'
                })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            // Format the response data
            const formattedOrders = orders.map(order => ({
                id: order._id,
                user: order.user_id,
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
                data: {
                    orders: formattedOrders,
                    pagination: {
                        currentPage: page,
                        totalPages: Math.ceil(totalOrders / limit),
                        totalOrders,
                        limit,
                        hasNextPage: page < Math.ceil(totalOrders / limit),
                        hasPrevPage: page > 1
                    }
                },
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

            if (search) {
                query.$or = [
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { brand: { $regex: search, $options: 'i' } }
                ];
            }

            if (category) {
                query.category = category;
            }

            const skip = (parseInt(page) - 1) * parseInt(limit);
            const sortOptions = {};
            sortOptions[sortBy] = order === 'asc' ? 1 : -1;

            // Get products with all necessary fields
            const products = await Product.find(query)
                .select('-__v')
                .sort(sortOptions)
                .skip(skip)
                .limit(parseInt(limit));

            const totalProducts = await Product.countDocuments(query);
            const totalPages = Math.ceil(totalProducts / limit);

            // Get categories for reference
            const categories = await Category.find().lean();
            const categoryMap = new Map(categories.map(cat => [cat.name, cat]));

            // Format product data
            const formattedProducts = products.map(product => ({
                id: product._id,
                name: product.name,
                description: product.description,
                shortDescription: product.shortDescription,
                price: product.price,
                dimensions: product.dimensions,
                stockQuantity: product.stockQuantity,
                material: product.material,
                category: product.category,
                categoryInfo: categoryMap.get(product.category) || { name: product.category },
                discount: product.discount,
                brand: product.brand,
                style: product.style,
                assemblyRequired: product.assemblyRequired,
                weight: product.weight,
                images: product.images,
                model3d: product.model3d,
                sales: product.sold,
                rating: product.rating
            }));

            res.status(200).json({
                success: true,
                data: {
                    products: formattedProducts,
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
            const product = await Product.findById(productId).lean();

            if (!product) {
                return res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
            }

            // Get inventory information
            const inventory = await Inventory.findOne({ productId: productId }).lean();

            // Get category information
            const category = await Category.findOne({ name: product.category }).lean();

            // Combine all data
            const productData = {
                ...product,
                inventoryInfo: inventory || {},
                categoryInfo: category || { name: product.category }
            };

            res.status(200).json({
                success: true,
                data: productData
            });

        } catch (error) {
            console.error('Error fetching product:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching product details',
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

    getSalesByyCategory: async (req, res) => {
        try {
            // First get categories for reference
            const categories = await Category.find().lean();
            const categoryMap = new Map(categories.map(cat => [cat._id.toString(), cat.name]));

            // Aggregate pipeline to get sales data by category
            const salesData = await Order.aggregate([
                {
                    $match: {
                        payment_status: "Completed",
                        delivery_status: "Delivered"
                    }
                },
                { $unwind: "$products" },
                {
                    $lookup: {
                        from: "products",
                        localField: "products.product",
                        foreignField: "_id",
                        as: "productData"
                    }
                },
                { $unwind: "$productData" },
                {
                    $group: {
                        _id: "$productData.category",
                        Value: {
                            $sum: {
                                $multiply: [
                                    { $toDouble: "$products.price" },
                                    { $toDouble: "$products.quantity" }
                                ]
                            }
                        }
                    }
                },
                {
                    $project: {
                        name: { 
                            $convert: {
                                input: "$_id",
                                to: "string",
                                onError: "Unknown Category"
                            }
                        },
                        Value: { $round: ["$Value", 2] },
                        _id: 0
                    }
                },
                { $sort: { Value: -1 } }
            ]);

            // Transform the data to use category names instead of IDs
            const formattedData = salesData.map(item => ({
                name: categoryMap.get(item.name) || "Unknown Category",
                Value: item.Value
            }));

            // Filter out categories with 0 value
            const nonZeroSales = formattedData.filter(item => item.Value > 0);

            res.status(200).json({
                success: true,
                data: nonZeroSales.length > 0 ? nonZeroSales : formattedData.slice(0, 5)
            });

        } catch (error) {
            console.error('Error fetching sales by category:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching sales by category',
                error: error.message
            });
        }
    },

    getSalesByCategory: async (req, res) => {
        try {
            // Aggregate pipeline to get sales by category
            const salesByCategory = await Order.aggregate([
                // Only include completed orders
                {
                    $match: {
                        paymentStatus: "completed",
                        deliveryStatus: "delivered"
                    }
                },
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
            // Set date range for 2024
            const startDate = new Date('2024-01-01');
            const endDate = new Date('2024-12-31');

            const monthlySales = await Order.aggregate([
                // Match orders from 2024 and completed status
                {
                    $match: {
                        payment_status: "Completed",
                        createdAt: {
                            $gte: startDate,
                            $lte: endDate
                        }
                    }
                },
                // Group by month
                {
                    $group: {
                        _id: { $month: "$createdAt" },
                        totalRevenue: { $sum: "$total_amount" },
                        orderCount: { $sum: 1 }
                    }
                },
                // Sort by month
                {
                    $sort: { "_id": 1 }
                }
            ]);

            // Create array for all months (1-12)
            const allMonths = Array.from({ length: 12 }, (_, i) => {
                const monthData = monthlySales.find(m => m._id === (i + 1)) || {
                    _id: i + 1,
                    totalRevenue: 0,
                    orderCount: 0
                };

                return {
                    month: i + 1,
                    monthName: new Date(2024, i).toLocaleString('en-US', { month: 'long' }),
                    revenue: parseFloat(monthData.totalRevenue.toFixed(2)),
                    orders: monthData.orderCount
                };
            });

            // Calculate totals
            const totalRevenue = allMonths.reduce((sum, month) => sum + month.revenue, 0);
            const totalOrders = allMonths.reduce((sum, month) => sum + month.orders, 0);

            res.status(200).json({
                success: true,
                data: {
                    monthlySales: allMonths,
                    summary: {
                        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
                        totalOrders,
                        averageMonthlyRevenue: parseFloat((totalRevenue / 12).toFixed(2))
                    }
                }
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
            // First get all categories and log them
            const categories = await Category.find({}, { name: 1 });
            console.log('Available categories:', categories);

            const categoriesMap = new Map(categories.map(cat => [cat._id.toString(), cat.name]));
            console.log('Categories map:', Object.fromEntries(categoriesMap));

            const categoryStats = await Order.aggregate([
                {
                    $match: {
                        payment_status: "Completed",
                        delivery_status: "Delivered"
                    }
                },
                { $unwind: "$products" },
                {
                    $lookup: {
                        from: "products",
                        localField: "products.product",
                        foreignField: "_id",
                        as: "productInfo"
                    }
                },
                {
                    $unwind: {
                        path: "$productInfo",
                        preserveNullAndEmptyArrays: false
                    }
                },
                // Add this stage to see what category IDs we're getting
                {
                    $project: {
                        category: "$productInfo.category",
                        amount: "$products.amount",
                        quantity: "$products.quantity"
                    }
                },
                {
                    $group: {
                        _id: "$category",
                        totalRevenue: {
                            $sum: {
                                $multiply: ["$amount", "$quantity"]
                            }
                        },
                        totalOrders: { $sum: 1 },
                        totalQuantity: { $sum: "$quantity" }
                    }
                },
                {
                    $facet: {
                        categories: [{ $match: {} }],
                        totalRevenue: [
                            {
                                $group: {
                                    _id: null,
                                    total: { $sum: "$totalRevenue" }
                                }
                            }
                        ]
                    }
                }
            ]);

            console.log('Raw category stats:', JSON.stringify(categoryStats[0].categories, null, 2));

            // Format results with debugging
            const formattedData = categoryStats[0]?.categories?.map(cat => {
                const categoryName = categoriesMap.get(cat._id);
                console.log('Looking up category:', {
                    id: cat._id,
                    foundName: categoryName
                });

                return {
                    category: categoryName || 'Unknown Category',
                    percentage: categoryStats[0]?.totalRevenue[0]?.total > 0
                        ? parseFloat(((cat.totalRevenue / categoryStats[0].totalRevenue[0].total) * 100).toFixed(1))
                        : 0,
                    totalRevenue: parseFloat(cat.totalRevenue.toFixed(2)),
                    totalOrders: cat.totalOrders,
                    totalQuantity: cat.totalQuantity
                };
            }) || [];

            // Sort by percentage descending
            formattedData.sort((a, b) => b.percentage - a.percentage);

            res.status(200).json({
                success: true,
                data: {
                    distribution: formattedData,
                    summary: {
                        totalCategories: formattedData.length,
                        totalRevenue: parseFloat(categoryStats[0]?.totalRevenue[0]?.total?.toFixed(2)) || 0,
                        totalOrders: formattedData.reduce((sum, cat) => sum + cat.totalOrders, 0),
                        totalQuantity: formattedData.reduce((sum, cat) => sum + cat.totalQuantity, 0)
                    }
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
            // Validate required fields
            const { user_name, email, password } = req.body;
            let role = req.body.role; // Changed from const to let

            if (!user_name || !email || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Please provide all required fields: user_name, email, and password"
                });
            }

            // Check if email already exists
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: "Email already registered"
                });
            }

            // Convert role string to number
            if (role === 'Customer') {
                role = 1;
            } else if (role === 'Admin') {
                role = 0;
            } else {
                role = 2; // Default or Moderator
            }

            // Hash password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            // Create new user
            const newUser = await User.create({ 
                user_name, 
                email, 
                password: hashedPassword,
                role,
                isActive: true,
                lastLogin: new Date()
            });

            // Remove password from response
            const userResponse = newUser.toObject();
            delete userResponse.password;

            res.status(201).json({
                success: true,
                message: "User created successfully",
                user: userResponse
            });

        } catch (error) {
            console.error('Error creating user:', error);
            res.status(500).json({
                success: false,
                message: "Error creating user",
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
    },

    // Add this new function to get category details
    getCategoryDetails: async (req, res) => {
        try {
            const categories = await Category.find({}, {
                _id: 1,
                name: 1,
                description: 1,
                images: 1,
                salesCount: 1
            });

            res.status(200).json({
                success: true,
                data: categories
            });
        } catch (error) {
            console.error('Error fetching categories:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching categories',
                error: error.message
            });
        }
    },

    getAllCategories: async (req, res) => {
        try {
            const categories = await Category.find()
                .select('name description')
                .sort({ name: 1 });

            res.status(200).json({
                success: true,
                data: categories,
                message: 'Categories fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching categories:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching categories',
                error: error.message
            });
        }
    },

    getAllCategories: async (req, res) => {
        try {
            const categories = await Category.find()
                .select('name description')
                .sort({ name: 1 });

            res.status(200).json({
                success: true,
                data: categories,
                message: 'Categories fetched successfully'
            });
        } catch (error) {
            console.error('Error fetching categories:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching categories',
                error: error.message
            });
        }
    },

    getUsersDashboard: async (req, res) => {
        try {
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0));

            // Tổng số users
            const totalUsers = await User.countDocuments();

            // Users mới trong ngày
            const newUsersToday = await User.countDocuments({
                createdAt: { $gte: startOfDay }
            });

            // Users active (đăng nhập trong 7 ngày qua)
            const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            const activeUsers = await User.countDocuments({
                lastLogin: { $gte: sevenDaysAgo }
            });

            // Tính Churn Rate (Users không active trong 30 ngày)
            const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            const inactiveUsers = await User.countDocuments({
                lastLogin: { $lt: thirtyDaysAgo }
            });
            const churnRate = ((inactiveUsers / totalUsers) * 100).toFixed(1);

            res.status(200).json({
                success: true,
                data: {
                    totalUsers,
                    newUsersToday,
                    activeUsers,
                    churnRate: `${churnRate}%`
                }
            });

        } catch (error) {
            console.error('Error fetching users dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching users dashboard',
                error: error.message
            });
        }
    },

    getUsersList: async (req, res) => {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 5;
            const search = req.query.search || '';

            const query = {
                $or: [
                    { user_name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            };

            // Tổng số users thỏa mãn điều kiện search
            const total = await User.countDocuments(query);

            // Lấy danh sách users với phân trang
            const users = await User.find(query)
                .select('_id user_name email role isBlocked lastLogin createdAt')
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            // Format dữ liệu trả về
            const formattedUsers = users.map(user => ({
                id: user._id,
                name: user.user_name,
                email: user.email,
                role: user.role === 0 ? 'Admin' : user.role === 1 ? 'Customer' : 'Moderator',
                status: user.isBlocked ? 'Inactive' : 'Active',
                lastLogin: user.lastLogin,
                createdAt: user.createdAt
            }));

            res.status(200).json({
                success: true,
                data: {
                    users: formattedUsers,
                    pagination: {
                        currentPage: page,
                        totalPages: Math.ceil(total / limit),
                        totalUsers: total,
                        limit
                    }
                }
            });

        } catch (error) {
            console.error('Error fetching users list:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching users list',
                error: error.message
            });
        }
    },

    getOrderStatusDistribution: async (req, res) => {
        try {
            const distribution = await orderService.getOrderStatusDistribution();
            res.status(200).json({
                success: true,
                data: distribution
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Error fetching order status distribution",
                error: error.message
            });
        }
    },

    getDailyOrders: async (req, res) => {
        try {
            const dailyOrders = await orderService.getDailyOrders();
            res.status(200).json({
                success: true,
                data: dailyOrders
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: "Error fetching daily orders",
                error: error.message
            });
        }
    },

    getSalesMetrics: async (req, res) => {
        try {
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

            // Get current month sales
            const currentMonthSales = await Order.aggregate([
                {
                    $match: {
                        order_date: { $gte: firstDayOfMonth },
                        payment_status: 'Completed'
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$total_amount' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Get last month sales
            const lastMonthSales = await Order.aggregate([
                {
                    $match: {
                        order_date: {
                            $gte: firstDayOfLastMonth,
                            $lte: lastDayOfLastMonth
                        },
                        payment_status: 'Completed'
                    }
                },
                {
                    $group: {
                        _id: null,
                        total: { $sum: '$total_amount' },
                        count: { $sum: 1 }
                    }
                }
            ]);

            // Get all-time metrics
            const allTimeMetrics = await Order.aggregate([
                {
                    $match: {
                        payment_status: 'Completed'
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: '$total_amount' },
                        totalOrders: { $sum: 1 }
                    }
                }
            ]);

            // Calculate metrics
            const currentMonthTotal = currentMonthSales[0]?.total || 0;
            const lastMonthTotal = lastMonthSales[0]?.total || 0;
            const salesGrowth = lastMonthTotal ? 
                ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 
                100;

            const totalRevenue = allTimeMetrics[0]?.totalRevenue || 0;
            const totalOrders = allTimeMetrics[0]?.totalOrders || 0;
            const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

            res.status(200).json({
                success: true,
                data: {
                    salesGrowth: {
                        percentage: parseFloat(salesGrowth.toFixed(2)),
                        currentMonth: parseFloat(currentMonthTotal.toFixed(2)),
                        lastMonth: parseFloat(lastMonthTotal.toFixed(2))
                    },
                    averageOrderValue: parseFloat(avgOrderValue.toFixed(2)),
                    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
                    metrics: {
                        totalOrders,
                        currentMonthOrders: currentMonthSales[0]?.count || 0,
                        lastMonthOrders: lastMonthSales[0]?.count || 0
                    }
                }
            });

        } catch (error) {
            console.error('Error calculating sales metrics:', error);
            res.status(500).json({
                success: false,
                message: 'Error calculating sales metrics',
                error: error.message
            });
        }
    },

    getSalesOverview: async (req, res) => {
        try {
            const currentDate = new Date();
            const startOfYear = new Date(currentDate.getFullYear(), 0, 1);

            const salesData = await Order.aggregate([
                {
                    $match: {
                        order_date: { $gte: startOfYear },
                        payment_status: 'Completed'
                    }
                },
                {
                    $group: {
                        _id: { $month: "$order_date" },
                        revenue: { $sum: "$total_amount" },
                        orders: { $sum: 1 }
                    }
                },
                { $sort: { "_id": 1 } }
            ]);

            // Calculate year-over-year growth
            const lastYearStartDate = new Date(currentDate.getFullYear() - 1, 0, 1);
            const lastYearEndDate = new Date(currentDate.getFullYear() - 1, 11, 31);

            const lastYearSales = await Order.aggregate([
                {
                    $match: {
                        order_date: {
                            $gte: lastYearStartDate,
                            $lte: lastYearEndDate
                        },
                        payment_status: 'Completed'
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$total_amount" }
                    }
                }
            ]);

            const currentYearTotal = salesData.reduce((acc, month) => acc + month.revenue, 0);
            const lastYearTotal = lastYearSales[0]?.totalRevenue || 0;
            const yearOverYearGrowth = lastYearTotal ? 
                ((currentYearTotal - lastYearTotal) / lastYearTotal) * 100 : 0;

            res.status(200).json({
                success: true,
                data: {
                    monthlySales: salesData.map(month => ({
                        month: month._id,
                        revenue: parseFloat(month.revenue.toFixed(2)),
                        orders: month.orders
                    })),
                    yearOverYearGrowth: parseFloat(yearOverYearGrowth.toFixed(2)),
                    totalRevenue: parseFloat(currentYearTotal.toFixed(2))
                }
            });

        } catch (error) {
            console.error('Error fetching sales overview:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching sales overview',
                error: error.message
            });
        }
    },

    getDailySalesTrend: async (req, res) => {
        try {
            const last7Days = new Date();
            last7Days.setDate(last7Days.getDate() - 6); // Get last 7 days including today

            const dailySales = await Order.aggregate([
                {
                    $match: {
                        order_date: { $gte: last7Days },
                        payment_status: 'Completed'
                    }
                },
                {
                    $group: {
                        _id: {
                            $dateToString: { format: "%Y-%m-%d", date: "$order_date" }
                        },
                        Sales: { $sum: "$total_amount" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        date: "$_id",
                        Sales: { $round: ["$Sales", 2] }
                    }
                },
                { $sort: { date: 1 } }
            ]);

            // Format dates to day names
            const formattedData = dailySales.map(item => ({
                name: new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' }),
                Sales: item.Sales
            }));

            res.status(200).json({
                success: true,
                data: formattedData
            });

        } catch (error) {
            console.error('Error fetching daily sales trend:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching daily sales trend',
                error: error.message
            });
        }
    },

};

module.exports = adminController;
