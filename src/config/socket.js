// config/socket.js
const io = require('socket.io'); // Require socket.io library

module.exports.initSocketIO  = (server) => { // Export a function that takes the server instance
    const io = require('socket.io')(server, { // Initialize Socket.IO with CORS settings
        cors: {
            origin: "http://localhost:3000", // Replace with your frontend URL
            methods: ["GET", "POST"] // Add other methods as needed
        }
    });

    const userSockets = new Map(); // Map to store user ID -> socket mappings

    io.on('connection', (socket) => {
        console.log('A user connected', socket.id);

        socket.on('setUserId', (userId) => {  // Event to associate user ID with socket
            userSockets.set(userId, socket);
            console.log(`User ${userId} associated with socket ${socket.id}`);
        });

        socket.on('disconnect', () => {  // Handle disconnections
            for (let [userId, userSocket] of userSockets.entries()) {
                if (userSocket === socket) {
                    userSockets.delete(userId);
                    console.log(`User ${userId} disconnected (socket ${socket.id})`);
                    break; // Exit loop once the socket is found
                }
            }
            console.log('User disconnected', socket.id);
        });

    });

    return { io, userSockets }; 
};

