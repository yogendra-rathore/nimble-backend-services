const express = require("express");
const http = require("http");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const cors = require("cors");
const socketIo = require("socket.io");
const cloudinary = require("cloudinary");
const ErrorHandler = require("./middleware/error");
const connectDatabase = require("./db/Database");
const { initializeSocket: initializeOrderSocket } = require('./controller/order');
const { initializeSocket: initializeNotificationSocket } = require('./utils/notificationHelper');

// Express app setup
const app = express();
const server = http.createServer(app);

// Socket.io setup with CORS
const io = socketIo(server, {
    cors: {
        origin: ['http://localhost:3000', 'https://fair-formerly-anchovy.ngrok-free.app', 'http://localhost:3001'],
        credentials: true
    }
});

// Initialize socket connections
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // User joins a specific room
    socket.on('join_user_room', (userId) => {
        socket.join(`user_${userId}`);
        console.log(`User joined room: user_${userId}`);
    });

    // Seller joins a specific room
    socket.on('join_seller_room', (shopId) => {
        socket.join(`seller_${shopId}`);
        console.log(`Seller joined room: seller_${shopId}`);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected:', socket.id);
    });
});

// Initialize sockets for order and notification
initializeOrderSocket(io);
initializeNotificationSocket(io)

// Setting up middlewares
app.use(cors({
    origin: ['http://localhost:3000', 'https://fair-formerly-anchovy.ngrok-free.app', 'http://localhost:3001'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Test route
app.use("/test", (req, res) => {
    res.send("Hello world!");
});

// Import routes
// const user = require("./controller/user");
const userRoutes = require("./routes/authRoutes");
const shop = require("./controller/shop");
const product = require("./controller/product");
const payment = require("./controller/payment");
const { router: order } = require("./controller/order");
const notification = require("./controller/notification");

// Use imported routes
app.use("/api/v2/user", userRoutes);
app.use("/api/v2/order", order);
app.use("/api/v2/shop", shop);
app.use("/api/v2/product", product);
app.use("/api/v2/payment", payment);
app.use("/api/v2/notification", notification);

// Error handling middleware
app.use(ErrorHandler);

// Handling uncaught Exception
process.on("uncaughtException", (err) => {
    console.log(`Error: ${err.message}`);
    console.log("Shutting down the server for handling uncaught exception");
});

// Configuring environment variables
if (process.env.NODE_ENV !== "PRODUCTION") {
    require("dotenv").config({ path: "config/.env" });
}

// Connecting to the database
connectDatabase();

// Configuring Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Set the io instance in the app for global access
app.set('io', io);

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Handling unhandled promise rejections
process.on("unhandledRejection", (err) => {
    console.log(`Shutting down the server for ${err.message}`);
    server.close(() => {
        process.exit(1);
    });
});

module.exports = { app, server };
