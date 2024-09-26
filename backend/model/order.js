const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
    cart: {
        type: Array,
        required: true,
    },
    modifiedCart: {
        type: Array,
        required: false,
    },
    shippingAddress: {
        type: Object,
        required: true,
    },
    user: {
        type: Object,
        required: true,
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    status: {
        type: String,
        default: "Pending",
    },
    paymentInfo: {
        id: {
            type: String,
        },
        status: {
            type: String,
        },
        type: {
            type: String,
        },
    },
    paidAt: {
        type: Date,
        default: Date.now,
    },
    deliveredAt: {
        type: Date,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    selectedCollectionTime: {
        type: Date,
        required: true,
    },
    orderCode: {
        type: String,
        required: true,
    },
    isPremium: {
        type: Boolean,
        default: false,
    },
});


module.exports = mongoose.model("Order", orderSchema);
