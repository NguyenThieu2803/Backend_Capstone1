const Notification = require("../model/Usermodel/Notification");
const Product = require("../model/Usermodel/Product");
// const { io } = require("../server");
const notificationService = {
    createNotification: async (userId, orderId, productId, notificationType = 'ORDER', title, message) => {
        try {
            const product = await Product.findById(productId);

            if (!product) {
                throw new Error("Product not found");
            }


            const notification = new Notification({
                user_id: userId,
                order_id: orderId,
                product: productId,
                notification_type: notificationType,
                title: title || 'Đơn hàng đã được đặt', // Use provided title or default
                message: message || 'Cảm ơn bạn đã mua sắm cùng FurniFit AR' // Use provided message or default
            });

            const savedNotification = await notification.save();



            // Emit the notification via Socket.IO:
            if (global.io && global.userSockets && global.userSockets.has(userId)) {
                global.userSockets.get(userId).emit('newNotification', savedNotification);
            }


            return savedNotification;

        } catch (error) {
            console.error("Error creating notification:", error);
            throw error; // Re-throw the error to be handled by the controller
        }
    },

    getNotificationsByUserId: async (userId) => {
        try {
            const notifications = await Notification.find({ user_id: userId })
                .populate('product', 'name images')
                .sort({ created_at: -1 });
            return notifications;
        } catch (error) {
            console.error("Error getting notifications:", error);
            throw error;
        }
    },


    markNotificationAsRead: async (userId, notificationId) => {
        try {
            const notification = await Notification.findOneAndUpdate(
                { _id: notificationId, user_id: userId },
                { is_read: true },
                { new: true } // Return the updated notification
            );
            return notification;
        } catch (error) {
            console.error("Error marking notification as read:", error);
            throw error;
        }
    },

    createPromotionNotification: async (userId, title, message) => { // New function for promotion notifications
        try {
            const notification = new Notification({
                user_id: userId,
                title,
                message,
                notification_type: 'PROMOTION' // Ensure correct type
            });
            await notification.save();
            return notification;
        } catch (error) {
            console.error("Error creating promotion notification:", error);
            throw error;
        }
    },
};




module.exports = notificationService;