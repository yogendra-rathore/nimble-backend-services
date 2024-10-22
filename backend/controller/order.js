const express = require("express");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const { isAuthenticated, isSeller, isAdmin } = require("../middleware/auth");
const Order = require("../model/order");
const Shop = require("../model/shop");
const Product = require("../model/product");
const Notification = require("../model/notification");
const { createAndEmitNotification } = require('../utils/notificationHelper');

// Socket.io instance
let io;

// Initialize socket
const initializeSocket = (socketIo) => {
  io = socketIo;
};

const generateOrderCode = () => {
  return Math.floor(1000 + Math.random() * 9000);
};

const createOrder = async (req, res, next) => {
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

      // Emit order update notification to seller
      if (io) {
        await createAndEmitNotification(io, {
          recipientId: shopId,
          recipientType: 'Seller',
          message: `A new order has been placed with id: ${order._id}.`,
          orderId: order._id,
          type: 'order_placed',
        });
      }
    }

    res.status(201).json({
      success: true,
      orders,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
};

router.post(
  "/create-order",
  catchAsyncErrors(createOrder)
);

// Helper function to calculate the collection date
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

// get all orders of user
router.get(
  "/get-all-orders/:userId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orders = await Order.find({ "user._id": req.params.userId }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// get all orders of seller
router.get(
  "/get-seller-all-orders/:shopId",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orders = await Order.find({
        "cart.shopId": req.params.shopId,
      }).sort({
        createdAt: -1,
      });

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Update order status for seller
router.put(
  "/update-order-status/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 400));
      }

      if (req.body.status === "Ask For Alternatives") {
        order.alternateItems = req.body.alternateItems;
      }

      if (req.body.status === "Ready") {
        order.cart.forEach(async (o) => {
          await updateOrder(o._id, o.qty, req);
        });
      }

      order.status = req.body.status;

      if (order.status === "Delivered") {
        order.deliveredAt = Date.now();
        order.paymentInfo.status = "Succeeded";
        const serviceCharge = 0;
        await updateSellerInfo(order.totalPrice - serviceCharge, req);
      }

      await order.save({ validateBeforeSave: false });

      console.log(`Order status updated: ${order.status}`);

      // Emit order update notification to customer
      if (io) {
        await createAndEmitNotification(io, {
          recipientId: order.user._id,
          recipientType: 'Customer',
          message: `Your order status has been updated to ${order.status}.`,
          orderId: order._id,
          type: 'order_update',
        });
      }

      res.status(200).json({
        success: true,
        order,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// Example usage in updateOrder function
async function updateOrder(id, qty, req) {
  const product = await Product.findById(id);

  product.stock -= qty;
  product.sold_out += qty;

  await product.save({ validateBeforeSave: false });

  // Emit out of stock notification if stock is zero
  if (product.stock <= 0 && io) {
    await createAndEmitNotification(io, {
      recipientId: product.shopId,
      recipientType: 'Seller',
      productId: product._id,
      message: `Product ${product.name} is out of stock.`,
      type: 'out_of_stock',
    });
  }
}

async function updateSellerInfo(amount, req) {
  const seller = await Shop.findById(req.seller.id);

  seller.availableBalance = seller.availableBalance + amount;
  if(!seller.location) {
    seller.location = "undefined";
  }
  await seller.save();
}

router.put(
  "/update-cart/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 400));
      }

      // Extract all product IDs from the modifiedCart
      const productIds = req.body.modifiedCart.map((item) => item._id);

      // Fetch all products in a single query
      const products = await Product.find({ _id: { $in: productIds } });

      if (products.length !== productIds.length) {
        throw new Error('Some products were not found');
      }

      // Create a product map for quick lookup
      const productMap = products.reduce((acc, product) => {
        acc[product._id] = product;
        return acc;
      }, {});

      // Update the cart by matching products from the map
      const updatedCart = req.body.modifiedCart.map((item) => {
        const product = productMap[item._id];

        if (!product) {
          throw new Error(`Product not found: ${item._id}`);
        }

        console.log({ Product: product.name, Quantity: item.qty });

        return { ...product.toObject(), qty: item.qty };
      });

      console.log({ updatedCart });

      // Update the cart with the fetched product details
      order.cart = updatedCart;

      // Clear the modifiedCart
      order.modifiedCart = null;

      await order.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        message: "Cart updated and modification cleared successfully",
        order,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


// give a refund ----- user
router.put(
  "/order-refund/:id",
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 400));
      }

      order.status = req.body.status;

      await order.save({ validateBeforeSave: false });

      res.status(200).json({
        success: true,
        order,
        message: "Order Refund Request successfully!",
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// accept the refund ---- seller
router.put(
  "/order-refund-success/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 400));
      }

      order.status = req.body.status;

      await order.save();

      res.status(200).json({
        success: true,
        message: "Order Refund successfull!",
      });

      if (req.body.status === "Refund Success") {
        order.cart.forEach(async (o) => {
          await updateOrder(o._id, o.qty, req);
        });
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

// all orders --- for admin
router.get(
  "/admin-all-orders",
  isAuthenticated,
  isAdmin("Admin"),
  catchAsyncErrors(async (req, res, next) => {
    try {
      const orders = await Order.find().sort({
        deliveredAt: -1,
        createdAt: -1,
      });
      res.status(201).json({
        success: true,
        orders,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

router.post("/verify-order/:orderId",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { orderId } = req.params;
      const { code } = req.body;
  
      // Find the order by ID
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found" });
      }
  
      // Check if the provided code matches the orderCode
      if (order.orderCode === code) {
        return res.status(200).json({ success: true });
      } else {
        return res.status(400).json({ success: false, message: "Invalid code" });
      }
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);

router.get(
  "/search-orders",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const { query } = req.query;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }

      // Initialize search criteria
      let searchCriteria = {
        $or: [
          { "user.name": { $regex: query, $options: "i" } }, // Customer Name
          { "cart.name": { $regex: query, $options: "i" } }, // Item Name
          { status: { $regex: query, $options: "i" } }, // Status
          { totalPrice: isNaN(query) ? undefined : Number(query) } // Exact match on total price
        ].filter(Boolean) // Remove invalid/undefined criteria
      };

      // Handle date parsing
      let startDate = null;
      let endDate = null;

      try {
        const parsedDate = new Date(query);
        if (!isNaN(parsedDate.getTime())) {
          startDate = new Date(parsedDate.setHours(0, 0, 0, 0)); // Start of the day
          endDate = new Date(parsedDate.setHours(23, 59, 59, 999)); // End of the day

          // Add date range criteria to the search
          searchCriteria.$or.push(
            { createdAt: { $gte: startDate, $lte: endDate } }, // Date range for createdAt
            { deliveredAt: { $gte: startDate, $lte: endDate } } // Date range for deliveredAt
          );
        }
      } catch (error) {
        // Log the invalid date format but do not add date criteria
        console.warn("Invalid date format:", query);
      }

      // Fetch orders based on search criteria
      const orders = await Order.find(searchCriteria).sort({ createdAt: -1 });

      if (orders.length === 0) {
        return res.status(404).json({ message: "No orders found" });
      }

      res.status(200).json({
        success: true,
        orders,
      });
    } catch (error) {
      console.error("Error in search-orders API:", error.message);
      return next(new ErrorHandler("An error occurred while searching for orders.", 500));
    }
  })
);

// Get order by ID
router.get(
  "/:id",
  isSeller,
  catchAsyncErrors(async (req, res, next) => {
    try {
      const order = await Order.findById(req.params.id);

      if (!order) {
        return next(new ErrorHandler("Order not found with this id", 404));
      }

      res.status(200).json({
        success: true,
        order,
      });
    } catch (error) {
      return next(new ErrorHandler(error.message, 500));
    }
  })
);


module.exports = {
  router,
  initializeSocket
};