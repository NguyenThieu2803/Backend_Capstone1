require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const authrouter = require('./router/auth.router');
const routes = require("./router/main.router");
const connectDB = require('./config/connectdb');
const port = process.env.POST || 5000;
const localhost = process.env.HOST;

const server = require('http').createServer(app);
const { initSocketIO } = require('./config/socket'); // Change here
const { io, userSockets } = initSocketIO(server); // Initialize Socket.IO

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
connectDB();

// Routes
app.use(routes);
app.use(authrouter);

// Start server
server.listen(port, localhost, () => {
    console.log(`Server listening at http://${localhost}:${port}`);
});

module.exports = {io}