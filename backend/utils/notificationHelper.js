// utils/notificationHelper.js
const Notification = require('../model/notification');

async function createAndEmitNotification(io, { recipientId, recipientType, message, orderId, productId, type }) {
    try {
        const notification = new Notification({
            recipientId,
            recipientType,
            message,
            orderId,
            productId,
            type,
        });

        await notification.save();
        if (recipientType === 'Customer') {
            io.to(`user_${recipientId}`).emit('notification', {
                message,
                recipientId,
                recipientType
            });
        } else if (recipientType === 'Seller') {
            io.to(`seller_${recipientId}`).emit('notification', {
                message,
                recipientId,
                recipientType
            });
        }

        console.log(`Notification sent to ${recipientType}_${recipientId}`);
    } catch (error) {
        console.error('Error creating and emitting notification:', error);
    }
}

module.exports = { createAndEmitNotification };