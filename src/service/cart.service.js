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

        // Save the updated cart
        await cart.save();

        return cart; // Return the updated cart

    } catch (err) {
        console.error("Error in serviceAddToCart:", err.message);
        throw err; // Re-throw the error so the caller can handle it
    }
}


const ServiceremoveFromCart = async (userId, productId, quantityToRemove) => {
    try {
        // Find the user's cart
        let cart = await ShoppingCart.findOne({ user_id: userId });
        if (!cart) {
            return { error: "Cart not found", status: 404 };
        }

        // Find the product in the cart
        const productIndex = cart.product.findIndex(
            (item) => item.product.toString() === productId
        );

        if (productIndex === -1) {
            return { error: "Product not found in cart", status: 404 };
        }

        const existingProduct = cart.product[productIndex]; // Get the product from the cart

        // If removing all or more than existing quantity, remove entirely
        if (quantityToRemove >= existingProduct.quantity) {
            cart.product.splice(productIndex, 1);
        } else {
            // Otherwise, just decrease the quantity and update total
            existingProduct.quantity -= quantityToRemove;
            existingProduct.total = existingProduct.quantity * existingProduct.price;
        }

        // Save the updated cart
        await cart.save();

        // Return the updated cart, populating product details
        const updatedCart = await ShoppingCart.findOne({ user_id: userId }).populate('product.product');
        return { cart: updatedCart };

    } catch (error) {
        console.error("Error in removeFromCart service:", error);
        return { error: "Server error", status: 500 };
    }
};



module.exports = {
    serviceAddToCart,ServiceremoveFromCart
}