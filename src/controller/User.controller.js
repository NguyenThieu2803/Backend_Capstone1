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

const userController = {
  //Get All users
  getAllUsers: async (req, res) => {
    try {
      const user = await User.find();
      return res.status(200).json(user);
    } catch (error) {
      return res.status(500).json(error);
    }
  },

  createReview: async (req, res) => {
    try {
      const fileData = req.files || [req.file];
      const { userId, productId, rating, comment } = req.body;

      // Validate required fields
      if (!userId || !productId || !rating) {
        return res.status(400).json({
          success: false,
          message: "Thiếu thông tin bắt buộc (userId, productId, rating)"
        });
      }

      // Validate rating range
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: "Rating phải từ 1 đến 5"
        });
      }

      // Kiểm tra sản phẩm tồn tại
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy sản phẩm"
        });
      }

      // Kiểm tra user tồn tại
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Không tìm thấy người dùng"
        });
      }

      // Kiểm tra xem người dùng đã đánh giá sản phẩm này chưa
      const existingReview = await Review.findOne({
        product_id: productId,
        user_id: userId,
      });

      if (existingReview) {
        return res.status(400).json({
          success: false,
          message: "Bạn đã đánh giá sản phẩm này trước đó"
        });
      }

      // Xử lý images
      const images = fileData ? fileData.map((file) => file.path) : [];

      // Tạo đánh giá mới
      const review = await Review.create({
        product_id: productId,
        user_id: userId,
        rating: parseInt(rating),
        comment: comment || "",
        images: images,
        review_date: new Date()
      });

      // Populate user information for response
      const populatedReview = await Review.findById(review._id)
        .populate('user_id', 'user_name email')
        .lean();

      // Format response
      const formattedReview = {
        id: populatedReview._id,
        rating: populatedReview.rating,
        comment: populatedReview.comment,
        review_date: populatedReview.review_date,
        images: populatedReview.images,
        user: {
          id: populatedReview.user_id._id,
          name: populatedReview.user_id.user_name,
          email: populatedReview.user_id.email
        }
      };

      res.status(201).json({
        success: true,
        message: "Đánh giá đã được tạo thành công",
        data: formattedReview
      });

    } catch (error) {
      console.error('Error in createReview:', error);
      res.status(500).json({
        success: false,
        message: "Lỗi máy chủ",
        error: error.message
      });
    }
  },

  getAllCategories: async (req, res) => {
    try {
      // Lấy tất cả các danh mục từ cơ sở dữ liệu
      const categories = await Category.find();

      // Trả về danh sách danh mục
      res.status(200).json({ categories });
      if (!categories) {
        return res.status(404).json({ message: "Không tìm thấy danh mục" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  },

  getReviewsByProduct: async (req, res) => {
    try {
      const { productId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      // Kiểm tra sản phẩm tồn tại
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ 
          success: false,
          message: "Không tìm thấy sản phẩm" 
        });
      }

      // Lấy reviews với thông tin user
      const reviews = await Review.find({ product_id: productId })
        .populate({
          path: 'user_id',
          select: 'user_name email' // Chỉ lấy user_name và email
        })
        .sort({ review_date: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      // Đếm tổng số reviews
      const total = await Review.countDocuments({ product_id: productId });

      // Format lại response data
      const formattedReviews = reviews.map(review => ({
        id: review._id,
        rating: review.rating,
        comment: review.comment,
        review_date: review.review_date,
        images: review.images,
        user_name: review.user_id.user_name,
        user_email: review.user_id.email
      }));

      res.status(200).json({
        success: true,
        data: {
          reviews: formattedReviews,
          pagination: {
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit),
            per_page: parseInt(limit)
          }
        }
      });
    } catch (error) {
      console.error('Error in getReviewsByProduct:', error);
      res.status(500).json({ 
        success: false,
        message: "Lỗi máy chủ",
        error: error.message 
      });
    }
  },

  updateReview: async (req, res) => {
    try {
      const { reviewId } = req.params;
      const { userId, rating, comment, isVerifiedPurchase } = req.body;

      const review = await Review.findById(reviewId);
      if (!review) {
        return res.status(404).json({ message: "Không tìm thấy đánh giá" });
      }

      // Kiểm tra xem người dùng có phải là người tạo đánh giá không
      if (review.user._id.toString() !== userId.toString()) {
        return res
          .status(403)
          .json({ message: "Bạn không có quyền chỉnh sửa đánh giá này" });
      }

      // Cập nhật các trường cần thiết
      if (rating) review.rating = rating;
      if (comment) review.comment = comment;
      if (typeof isVerifiedPurchase !== "undefined") {
        review.isVerifiedPurchase = isVerifiedPurchase;
      }

      // Nếu có upload hình ảnh mới
      if (req.files && req.files.length > 0) {
        const newImages = req.files.map((file) => file.path);
        review.images.push(...newImages); // Thêm ảnh mới vào review
      }

      await review.save();

      res
        .status(200)
        .json({ message: "Đánh giá được cập nhật thành công", review });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  },

  deleteReview: async (req, res) => {
    try {
      const userId = req.user._id; // Lấy userId từ thông tin người dùng
      const { reviewId } = req.params;

      const review = await Review.findById(reviewId);

      if (!review) {
        return res.status(404).json({ message: "Không tìm thấy đánh giá" });
      }

      // Kiểm tra xem người dùng có phải là người tạo đánh giá không
      if (review.user._id.toString() !== userId.toString()) {
        return res
          .status(403)
          .json({ message: "Bạn không có quyền xóa đánh giá này" });
      }

      await review.deleteOne();

      res.status(200).json({ message: "Đánh giá đã được xóa thành công" });
    } catch (error) {
      res.status(500).json({ message: "Lỗi máy chủ", error: error.message });
    }
  },
  getProductById: async (req, res) => {
    try {
      const data = await Product.findOne({ _id: req.params.id });
      if (data.length < 0) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.status(201).json(data);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  getAllProducts: async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1; // Get the page number from the query string, or default to 1, if not provided
      const limit = parseInt(req.query.limit) || 20; // Set the default limit to 20
      const skip = (page - 1) * limit; // Calculate the number of documents to skip

      const products = await Product.find({})
        .skip(skip) // Skip the specified number of documents
        .limit(limit); // Limit the number of documents to retrieve, starting from the specified offset

      const totalProducts = await Product.countDocuments(); // Count all products

      res.status(200).json({
        products,
        currentPage: page,
        totalPages: Math.ceil(totalProducts / limit), // Calculate total pages
        totalProducts: totalProducts,
      });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Cart controllers
  addToCart: async (req, res) => {
    try {
      const userId = req.user.id;
      const { productId, quantity } = req.body;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
      }

      const updatedCart = await serviceAddToCart(userId, productId, quantity);

      // Return the updated cart
      res.status(200).json(updatedCart);
    } catch (error) {
      console.error("Error adding to cart:", error.message);
      if (error.message === "Invalid product ID") {
        res.status(404).json({ message: "Invalid product ID" });
      } else {
        res.status(500).json({ message: "Server error" });
      }
    }
  },
  removeFromCart: async (req, res) => {
    try {
      const userId = req.body.userId; // Get the user ID from the request body
      const productId = req.body.productId;
      const quantityToRemove = req.body.quantity || 1; // Allow specifying quantity, default to 1

      if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
      }

      // Find the user's cart
      let cart = await ShoppingCart.findOne({ user_id: userId }); // Find the user's cart
      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      // Find the product in the cart
      const productIndex = cart.product.findIndex(
        (item) => item.product.toString() === productId
      );

      if (productIndex === -1) {
        // Product not found in cart
        return res.status(404).json({ message: "Product not found in cart" });
      }

      const existingProduct = cart.product[productIndex]; // Get the product from the cart

      // If removing all or more than existing quantity, remove entirely
      if (quantityToRemove >= existingProduct.quantity) {
        cart.product.splice(productIndex, 1);
      } else {
        // Otherwise, just decrease the quantity and update total
        existingProduct.quantity -= quantityToRemove;
        existingProduct.total =
          existingProduct.quantity * existingProduct.price;
      }

      // Save the updated cart
      await cart.save();
      const updatedCart = await ShoppingCart.findOne({
        user_id: userId,
      }).populate("product.product");

      res.status(200).json(updatedCart); //Return the updated cart

      res.status(200).json(cart);
    } catch (error) {
      console.error("Error removing from cart:", error); // ... error handling ...
      res.status(500).json({ message: "Server error" });
    }
  },
  getAllCartbyUser: async (req, res) => {
    try {
      // Check if req.user exists
      if (!req.user) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const userId = req.user.id;
      const cart = await ServiceGetallCartByUser(userId);

      if (!cart) {
        return res.status(404).json({ message: "Cart not found" });
      }

      res.status(200).json(cart);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  },
  getAllCart: async (req, res) => {
    try {
      const cart = await ShoppingCart.find();
      res.status(200).json(cart);
    } catch (error) {
      console.error("Error fetching cart:", error);
      res
        .status(500)
        .json({ message: "Internal server error", error: error.message });
    }
  },
  updateCartItem: async (req, res) => {
    try {
      const userId = req.user.id;
      const { productId, quantity } = req.body;

      if (!productId || quantity == null) {
        return res.status(400).json({ message: "Product ID and quantity are required" });
      }

      const updatedCart = await serviceUpdateCartItem(userId, productId, quantity);

      if (updatedCart.error) {
        return res.status(updatedCart.status).json({ message: updatedCart.error });
      }

      res.status(200).json(updatedCart);
    } catch (error) {
      console.error("Error updating cart item:", error.message);
      res.status(500).json({ message: "Server error" });
    }
  },

  deleteCartItem: async (req, res) => {
    try {
      const userId = req.user.id;
      const { productId } = req.body;

      if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
      }

      const updatedCart = await serviceDeleteCartItem(userId, productId);

      if (updatedCart.error) {
        return res.status(updatedCart.status).json({ message: updatedCart.error });
      }

      res.status(200).json(updatedCart);
    } catch (error) {
      console.error("Error deleting cart item:", error.message);
      res.status(500).json({ message: "Server error" });
    }
  },
  // Inventory controllers
  getAllInventory: async (req, res) => {
    try {
      const inventory = await Inventory.find(); // Fetch all inventory data
      res.status(200).json(inventory);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Server error" });
    }
  },

  // Wishlist controllers
  addToWishlist: async (req, res) => {
    try {
      const userId = req.body.userId; // Get the user ID from the request body
      const productId = req.body.productId;

      // 1. Fetch the product name
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // 2. Find or create the user's wishlist
      let wishlist = await Wishlist.findOne({ user_id: userId });
      if (!wishlist) {
        wishlist = new Wishlist({ user_id: userId, products: [] });
      }

      // 3. Create a new WishlistProduct document WITH the product name
      const wishlistProduct = new WishlistProduct({
        wishlist_id: wishlist._id,
        product_id: productId,
        productName: product.name, // Store the fetched product name
      });
      await wishlistProduct.save();

      // 4. Add the WishlistProduct to the Wishlist's products array
      wishlist.products.push(wishlistProduct._id);
      await wishlist.save();

      res.status(201).json({
        message: "Product added to wishlist!",
        wishlist,
      });
    } catch (error) {
      // ... error handling ...
    }
  },
  getWishlist: async (req, res) => {
    try {
      const userId = req.params.userId;

      const wishlist = await Wishlist.findOne({ user_id: userId }).populate({
        //Populate the WishlistProduct documents
        path: "products",
        populate: {
          path: "product_id",
          model: "Product",
          select: "name", // Select only the 'name' field from the Product
        },
      });

      if (!wishlist) {
        return res.status(404).json({ message: "Wishlist not found" });
      }

      res.status(200).json({ wishlist: wishlist });

      res.status(200).json({ wishlist: wishlist });
    } catch (error) {
      // ... error handling ...
    }
  },

  removeFromWishlist: async (req, res) => {
    try {
      //console.log("Request Body:", req.body);
      const userId = req.body.userId; // Get the user ID from the request body
      const productId = req.body.productId;

      if (!productId) {
        return res.status(400).json({ message: "Product ID is required" });
      }

      // Find the user's wishlist
      const wishlist = await Wishlist.findOne({ user_id: userId });
      if (!wishlist) {
        return res.status(404).json({ message: "Wishlist not found" });
      }

      // Find the product in the wishlist
      const productIndex = wishlist.products.findIndex((item) => {
        console.log("Item:", item); // Log the entire 'item' object
        console.log("Item.product_id:", item.product_id); // Log the product_id property
        if (item && item.product_id) {
          // Check if both item and item.product_id exist
          return item.product_id.toString() === productId;
        } else {
          return false; // Handle cases where item or item.product_id is undefined
        }
      });

      // Remove the product from the wishlist
      wishlist.products.splice(productIndex, 1);

      // Save the updated wishlist
      await wishlist.save();

      res.status(200).json({ message: "Product removed from wishlist" });
    } catch (error) {
      console.error("Error removing from wishlist:", error); // ... error handling ...
      res.status(500).json({ message: "Server error" });
    }
  },

  // Order controller
  CreateOrderController: async (req, res) => {
    try {
      const model = {
        userId: req.body.userId,
        cardName: req.body.cardName,
        cardNumber: req.body.cardNumber,
        cardExMonth: req.body.cardExMonth,
        cardExYear: req.body.cardExYear,
        cardCVC: req.body.cardCVC,
        amount: req.body.amount,
        paymentMethodId: req.body.paymentMethodId // Ensure this is passed
      };

      const result = await orderService.createOrder(model);

      res.status(200).json({
        message: "Order placed successfully",
        data: result,
      });
    } catch (error) {
      console.error("Error creating order:", error.message || error);
      res.status(500).json({ message: error.message || "Server error" });
    }
  },
  UpdateOrderController: async (req, res) => {
    try {
      orderService.updateOrder(req.body, (error, result) => {
        if (error) {
          res.status(500).json({ message: "Server error" });
        } else {
          res.status(200).send({
            message: "Order placed successfully",
            data: result,
          });
        }
      });
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
  FindOrderController: async (req, res) => {
    try {
      orderService.GetOrder(req.body, (error, result) => {
        if (error) {
          res.status(500).json({ message: "Server error" });
        } else {
          res.status(200).send({
            message: "Order placed successfully",
            data: result,
          });
        }
      });
    } catch (error) {
      console.error("Error updating order:", error);
      res.status(500).json({ message: "Server error" });
    }
  },
  // Thêm phương thức để lấy sản phẩm theo category
  getProductsByCategory: async (req, res) => {
    try {
      const categoryId = req.params.categoryId;
      
      // Kiểm tra category có tồn tại
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      // Lấy sản phẩm theo category
      const products = await Product.find({ category: categoryId })
        .populate('category')
        .sort({ createdAt: -1 });

      return res.status(200).json({
        success: true,
        products: products
      });
    } catch (error) {
      console.error('Error getting products by category:', error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error.message
      });
    }
  },

  addCard: async (req, res) => {
    try {
      const cardData = {
        ...req.body,
        user_id: req.user.id // Use user_id from authenticated user
      };
      const card = await cardService.addCard(cardData);
      res.status(201).json({ message: "Card added successfully", card });
    } catch (error) {
      console.error("Error adding card:", error.message);
      res.status(500).json({ message: error.message || "Server error" });
    }
  },

  updateCard: async (req, res) => {
    try {
      const { cardId } = req.params;
      const card = await cardService.updateCard(req.user.id, cardId, req.body);
      res.status(200).json({ message: "Card updated successfully", card });
    } catch (error) {
      console.error("Error updating card:", error.message);
      res.status(500).json({ message: error.message || "Server error" });
    }
  },

  deleteCard: async (req, res) => {
    try {
      const { cardId } = req.params;
      await cardService.deleteCard(req.user.id, cardId);
      res.status(200).json({ message: "Card deleted successfully" });
    } catch (error) {
      console.error("Error deleting card:", error.message);
      res.status(500).json({ message: error.message || "Server error" });
    }
  },

  getAllCards: async (req, res) => {
    try {
      const cards = await cardService.getAllCards(req.user.id);
      res.status(200).json({ message: "Cards retrieved successfully", cards });
    } catch (error) {
      console.error("Error retrieving cards:", error.message);
      res.status(500).json({ message: error.message || "Server error" });
    }
  },


  // Address controller
  addAddress: async (req, res) => {
    try {
      const addressData = {
        ...req.body,
        user_id: req.user.id // Use user_id from authenticated user
      };
      const address = await addressService.addAddress(addressData);
      res.status(201).json({ message: "Address added successfully", address });
    } catch (error) {
      console.error("Error adding address:", error.message);
      res.status(500).json({ message: error.message || "Server error" });
    }
  },

  updateAddress: async (req, res) => {
    try {
      const { addressId } = req.body;
      const address = await addressService.updateAddress(req.user.id, addressId, req.body);
      res.status(200).json({ message: "Address updated successfully", address });
    } catch (error) {
      console.error("Error updating address:", error.message);
      res.status(500).json({ message: error.message || "Server error" });
    }
  },

  deleteAddress: async (req, res) => {
    try {
      const { addressId } = req.body;
      await addressService.deleteAddress(req.user.id, addressId);
      res.status(200).json({ message: "Address deleted successfully" });
    } catch (error) {
      console.error("Error deleting address:", error.message);
      res.status(500).json({ message: error.message || "Server error" });
    }
  },

  getAllAddresses: async (req, res) => {
    try {
      const addresses = await addressService.getAllAddresses(req.user.id);
      res.status(200).json({ message: "Addresses retrieved successfully", addresses });
    } catch (error) {
      console.error("Error retrieving addresses:", error.message);
      res.status(500).json({ message: "Server error" });
    }
  },

  searchProducts: async (req, res) => {
    try {
      const { query } = req.query;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      if (!query) {
        return res.status(400).json({
          success: false,
          message: "Search query is required"
        });
      }

      // Tạo regular expression để tìm kiếm không phân biệt hoa thường
      const searchRegex = new RegExp(query, 'i');

      // Tìm kiếm sản phẩm theo tên
      const products = await Product.find({ 
        name: { $regex: searchRegex } 
      })
      .skip(skip)
      .limit(limit);

      // Đếm tổng số sản phẩm tìm được
      const total = await Product.countDocuments({ 
        name: { $regex: searchRegex } 
      });

      res.status(200).json({
        success: true,
        data: {
          products,
          pagination: {
            total,
            page,
            pages: Math.ceil(total / limit),
            per_page: limit
          }
        }
      });

    } catch (error) {
      console.error('Error searching products:', error);
      res.status(500).json({
        success: false,
        message: "Lỗi server khi tìm kiếm sản phẩm",
        error: error.message
      });
    }
  },

};

module.exports = userController;
