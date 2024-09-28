const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'recipientType',
  },
  recipientType: {
    type: String,
    required: true,
    enum: ['Customer', 'Seller'],
  },
  message: {
    type: String,
    required: true,
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: function () {
      return this.type !== 'out_of_stock';
    },
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: function () {
      return this.type === 'out_of_stock';
    },
  },
  type: {
    type: String,
    required: true,
    enum: ['order_placed', 'order_update', 'out_of_stock'],
  },
  date: {
    type: Date,
    default: Date.now,
  },
  read: {
    type: Boolean,
    default: false,
  },
});

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;