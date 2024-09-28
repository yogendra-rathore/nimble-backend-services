// const socketIo = require("socket.io");
// const Notification = require('./model/notification');

// function initializeSocket(server) {
//     const io = socketIo(server, {
//         cors: {
//             origin: ['http://localhost:3000', 'https://fair-formerly-anchovy.ngrok-free.app', 'http://localhost:3001'],
//             credentials: true
//         }
//     });

//     io.on("connection", (socket) => {
//         console.log("A user connected");

//         socket.on("join_user_room", (userId) => {
//             socket.join(`user_${userId}`);
//             console.log(`User joined room: user_${userId}`);
//         });

//         socket.on("join_seller_room", (shopId) => {
//             socket.join(`seller_${shopId}`);
//             console.log(`Seller joined room: seller_${shopId}`);
//         });

//         socket.on("disconnect", () => {
//             console.log("A user disconnected");
//         });
//     });

//     return io;
// }

// function emitNewOrder(io, shopId, order) {
//     io.to(`seller_${shopId}`).emit('new_order', { order });
// }

// function emitOrderUpdate(io, userId, order) {
//     io.to(`user_${userId}`).emit('order_update', { order });
// }

// function emitOutOfStock(io, shopId, product) {
//     io.to(`seller_${shopId}`).emit('out_of_stock', { product });
// }

// module.exports = { initializeSocket, emitNewOrder, emitOrderUpdate, emitOutOfStock };