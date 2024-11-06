const ShoppingCart = require("../model/Usermodel/ShoppingCart");
const Product = require("../model/Usermodel/Product");
const mongoose = require('mongoose');
    //Add product to cart
    //Add product to cart
    const serviceAddToCart = async (userId, productId, quantity) => {
      try {
          // Tìm hoặc tạo giỏ hàng của người dùng
          let cart = await ShoppingCart.findOne({ user_id: userId });
          if (!cart) {
              cart = new ShoppingCart({
                  user_id: userId,
                  product: [], // Khởi tạo mảng sản phẩm rỗng
              });
          }
  
          // Kiểm tra xem sản phẩm có tồn tại trong bộ sưu tập Product không
          
          const productExists = await Product.findById(productId);
          if (!productExists) {
              throw new Error("Invalid product ID");
          }
  
          // Tính toán giá sau khi áp dụng giảm giá
          const priceAfterDiscount = productExists.price * (1 - (productExists.discount / 100));
  
          // Tìm sản phẩm đã có trong giỏ hàng
          const existingProductIndex = cart.product.findIndex(
              (item) => item.product.toString() === productId
          );
  
          if (existingProductIndex !== -1) {
              // Nếu sản phẩm đã tồn tại trong giỏ hàng, cập nhật số lượng và tổng số
              cart.product[existingProductIndex].quantity += quantity;
              cart.product[existingProductIndex].total =
                  cart.product[existingProductIndex].quantity * priceAfterDiscount;
          } else {
              // Thêm sản phẩm mới vào giỏ hàng
              const newProduct = {
                  name: productExists.name,
                  product: productId,
                  quantity: quantity,
                  price: productExists.price,
                  total: quantity * priceAfterDiscount,
                  discount: productExists.discount,
                  addedAt: new Date(),
              };
  
              cart.product.push(newProduct);
          }
  
          // Tính toán tổng giá trị mới của giỏ hàng
          cart.cartTotal = cart.product.reduce((acc, item) => acc + item.total, 0);
  
          // Lưu giỏ hàng đã cập nhật
          await cart.save();
  
          return cart; // Trả về giỏ hàng đã cập nhật
      } catch (err) {
          console.error("Error in serviceAddToCart:", err.message);
          throw err; // Ném lỗi để caller xử lý
      }
  };
  
    


    const ServiceGetallCartByUser = async(userId) => {
        try {
            // Tìm giỏ hàng của người dùng và populate các chi tiết sản phẩm
            const cart = await ShoppingCart.findOne({ user_id: userId }).populate('product.product');
    
            if (!cart) {
                return { error: "Cart not found", status: 404 }; // Giỏ hàng không tồn tại
            }
    
            // Tính toán lại tổng giá trị giỏ hàng
            cart.cartTotal = cart.product.reduce((acc, item) => acc + item.total, 0);
    
            return cart; // Trả về giỏ hàng cùng với tổng giá trị
    
        } catch (err) {
            console.error("Error in serviceGetallCart:", err.message);
            throw err; // Ném lỗi để caller xử lý
        }
    };
    


const serviceUpdateCartItem = async (userId, productId, quantity) => {
  try {
    let cart = await ShoppingCart.findOne({ user_id: userId });
    if (!cart) {
      return { error: "Cart not found", status: 404 };
    }

    const productIndex = cart.product.findIndex(
      (item) => item.product.toString() === productId
    );

    if (productIndex === -1) {
      return { error: "Product not found in cart", status: 404 };
    }

    if (quantity <= 0) {
      cart.product.splice(productIndex, 1);
    } else {
      cart.product[productIndex].quantity = quantity;
      cart.product[productIndex].total = quantity * cart.product[productIndex].price;
    }

    cart.cartTotal = cart.product.reduce((acc, item) => acc + item.total, 0);
    await cart.save();

    return await ShoppingCart.findOne({ user_id: userId }).populate('product.product');
  } catch (error) {
    console.error("Error in serviceUpdateCartItem:", error.message);
    return { error: "Server error", status: 500 };
  }
};

const serviceDeleteCartItem = async (userId, productId) => {
  try {
    let cart = await ShoppingCart.findOne({ user_id: userId });
    if (!cart) {
      return { error: "Cart not found", status: 404 };
    }

    const productIndex = cart.product.findIndex(
      (item) => item.product.toString() === productId
    );

    if (productIndex === -1) {
      return { error: "Product not found in cart", status: 404 };
    }

    cart.product.splice(productIndex, 1);
    cart.cartTotal = cart.product.reduce((acc, item) => acc + item.total, 0);
    await cart.save();

    return await ShoppingCart.findOne({ user_id: userId }).populate('product.product');
  } catch (error) {
    console.error("Error in serviceDeleteCartItem:", error.message);
    return { error: "Server error", status: 500 };
  }
};

const getTotalQuantitiesByUserAndProductIds = async (userId, productArray) => {
  // Trích xuất productId từ mảng sản phẩm
  const productIds = productArray.map(item => item.productId);

  // Chuyển đổi productIds từ chuỗi sang ObjectId
  const objectIdArray = productIds.map(id => new mongoose.Types.ObjectId(id));

  // Tìm số lượng sản phẩm trong giỏ hàng của người dùng
  const result = await ShoppingCart.aggregate([
    { $match: { user_id: userId } }, // Lọc theo userId
    { $unwind: '$product' }, // Phân rã mảng product
    { $match: { 'product.product': { $in: objectIdArray } } }, // Lọc các sản phẩm theo productId
    {
      $group: {
        _id: '$product.product', // Nhóm theo productId
        totalQuantity: { $sum: '$product.quantity' } // Tính tổng số lượng
      }
    },
    {
      $project: {
        _id: 0, // Loại bỏ _id khỏi kết quả
        productId: '$_id', // Đổi tên _id thành productId
        totalQuantity: 1 // Giữ lại tổng số lượng
      }
    }
  ]);

  return result;
};

// remove product from cart
const serviceRemoveProductFromCart = async (userId, productArray) => {
    try {
      const productIds = productArray.map(item => item.productId);
  
      // Chuyển đổi productIds từ chuỗi sang ObjectId
      const objectIdArray = productIds.map(id => new mongoose.Types.ObjectId(id));
  
      // Tìm giỏ hàng của người dùng và xoá sản phẩm
      const cart = await ShoppingCart.findOneAndUpdate(
        { user_id: userId },
        { $pull: { product: { product: { $in: objectIdArray } } } },
        { new: true }
      );
  
      // Nếu không tìm thấy giỏ hàng, trả về lỗi
      if (!cart) {
        return { error: "Cart not found", status: 404 };
      }
  
      // Trả về giỏ hàng mới sau khi xoá sản phẩm
      return cart;
    } catch (error) {
      console.error("Error in serviceRemoveProductFromCart:", error.message);
      return { error: "Server error", status: 500 };
    }
  };



module.exports = {
    serviceAddToCart,
    ServiceGetallCartByUser,
    serviceUpdateCartItem,
    serviceDeleteCartItem,
    getTotalQuantitiesByUserAndProductIds,
    serviceRemoveProductFromCart
};
