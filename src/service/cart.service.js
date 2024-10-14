const ShoppingCart = require("../model/Usermodel/ShoppingCart");
const Product = require("../model/Usermodel/Product");

    //Add product to cart
    //Add product to cart
    const serviceAddToCart = async (userId, productId, quantity) => {
        try {
            // Find or create the user's cart
            let cart = await ShoppingCart.findOne({ user_id: userId });
            if (!cart) {
                cart = new ShoppingCart({
                    user_id: userId,
                    product: [], // Initialize with an empty product array
                });
            }
    
            // Check if the product exists in the Product collection
            const productExists = await Product.findById(productId);
            if (!productExists) {
                throw new Error("Invalid product ID");
            }
    
            // Find if the product is already in the cart
            const existingProductIndex = cart.product.findIndex(
                (item) => item.product.toString() === productId
            );
    
            if (existingProductIndex !== -1) {
                // If the product exists in the cart, update its quantity and total
                cart.product[existingProductIndex].quantity += quantity;
                cart.product[existingProductIndex].total =
                    cart.product[existingProductIndex].quantity *
                    cart.product[existingProductIndex].price;
            } else {
                // Add the new product to the cart
                const newProduct = {
                    name: productExists.name,
                    product: productId,
                    quantity: quantity,
                    price: productExists.price,
                    total: quantity * productExists.price,
                    discount: 0,
                    addedAt: new Date(),
                };
    
                cart.product.push(newProduct);
            }
    
            // Calculate the new total cart value
            cart.cartTotal = cart.product.reduce((acc, item) => acc + item.total, 0);
    
            // Save the updated cart
            await cart.save();
    
            return cart; // Return the updated cart
    
        } catch (err) {
            console.error("Error in serviceAddToCart:", err.message);
            throw err; // Re-throw the error so the caller can handle it
        }
    };
    


    const ServiceremoveFromCart = async (userId, productId, quantityToRemove) => {
        try {
            // Tìm giỏ hàng của người dùng
            let cart = await ShoppingCart.findOne({ user_id: userId });
            if (!cart) {
                return { error: "Cart not found", status: 404 }; // Giỏ hàng không tồn tại
            }
    
            // Tìm sản phẩm trong giỏ hàng
            const productIndex = cart.product.findIndex(
                (item) => item.product.toString() === productId
            );
    
            if (productIndex === -1) {
                return { error: "Product not found in cart", status: 404 }; // Sản phẩm không tồn tại trong giỏ hàng
            }
    
            const existingProduct = cart.product[productIndex]; // Lấy sản phẩm từ giỏ hàng
    
            // Nếu số lượng xóa lớn hơn hoặc bằng số lượng hiện tại, xóa sản phẩm
            if (quantityToRemove >= existingProduct.quantity) {
                cart.product.splice(productIndex, 1); // Xóa sản phẩm khỏi giỏ hàng
            } else {
                // Nếu chỉ giảm số lượng, cập nhật số lượng và tổng giá trị của sản phẩm
                existingProduct.quantity -= quantityToRemove;
                existingProduct.total = existingProduct.quantity * existingProduct.price;
            }
    
            // Tính toán lại tổng giá trị giỏ hàng
            cart.cartTotal = cart.product.reduce((acc, item) => acc + item.total, 0);
    
            // Lưu lại giỏ hàng đã được cập nhật
            await cart.save();
    
            // Trả về giỏ hàng đã được cập nhật, bao gồm chi tiết sản phẩm
            const updatedCart = await ShoppingCart.findOne({ user_id: userId }).populate('product.product');
            return { cart: updatedCart };
    
        } catch (error) {
            console.error("Error in removeFromCart service:", error);
            return { error: "Server error", status: 500 }; // Xử lý lỗi máy chủ
        }
    };
    


    const ServiceGetallCart = async(userId) => {
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
    


module.exports = {
    serviceAddToCart,ServiceremoveFromCart,ServiceGetallCart
}