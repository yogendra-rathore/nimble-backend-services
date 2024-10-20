// utils/notificationHelper.js
const Notification = require('../model/notification');
const Order = require('../model/order');
const ErrorHandler = require('./ErrorHandler');

let io;

const initializeSocket = (socketIo) => {
  io = socketIo;
};


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

const calculateCollectionDate = (option) => {
    const now = new Date();
    switch (option) {
      case "2 hours":
        now.setHours(now.getHours() + 2);
        break;
      case "5 hours":
        now.setHours(now.getHours() + 5);
        break;
      case "next day":
        now.setDate(now.getDate() + 1);
        now.setHours(0, 0, 0, 0); // Set time to start of the next day
        break;
      default:
        now.setDate(now.getDate() + 1);
        now.setHours(0, 0, 0, 0); // Set time to start of the next day
        break;
    }
    return now;
  };

  const generateOrderCode = () => {
    return Math.floor(1000 + Math.random() * 9000);
  };
  
   const createOrder = async (req) => {
    try {
      const { cart, shippingAddress, user, totalPrice, paymentInfo, selectedCollectionTime, isPremium } = req.body;
  
      // Calculate collection date
      const collectionDate = calculateCollectionDate(selectedCollectionTime);
      console.log({ collectionDate });
      const shopItemsMap = new Map();
  
      for (const item of cart) {
        const shopId = item.shopId;
        if (!shopItemsMap.has(shopId)) {
          shopItemsMap.set(shopId, []);
        }
        shopItemsMap.get(shopId).push(item);
      }
  
      const orders = [];
  
      for (const [shopId, items] of shopItemsMap) {
        const orderCode = generateOrderCode();
  
        const order = await Order.create({
          cart: items,
          shippingAddress,
          user,
          totalPrice,
          paymentInfo,
          selectedCollectionTime: collectionDate,
          orderCode,
          isPremium,
        });
        orders.push(order);
  
        if(io) {
          await createAndEmitNotification(io, {
            recipientId: shopId,
            recipientType: 'Seller',
            message: `A new order has been placed with id: ${order._id}.`,
            orderId: order._id,
            type: 'order_placed',
          });
        }
      }
  
      // res.status(201).json({
      //   success: true,
      //   orders,
      // });
      return orders;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new ErrorHandler(error.message, 500);
    }
  };

module.exports = { createAndEmitNotification, calculateCollectionDate, createOrder, initializeSocket };