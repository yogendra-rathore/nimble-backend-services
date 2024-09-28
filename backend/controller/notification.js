const express = require("express");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const router = express.Router();
const ErrorHandler = require("../utils/ErrorHandler");
const { ObjectId } = require('mongodb');
const Notification = require("../model/notification");

// Notification routes

// Get notifications by recipientId
router.get('/:recipientId', catchAsyncErrors(async (req, res, next) => {
  try {
    const recipientId = new ObjectId(req.params.recipientId);
    const notifications = await Notification.find({ recipientId });
    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

// Create a new notification
router.post('/:recipientId', catchAsyncErrors(async (req, res, next) => {
  try {
    const recipientId = new ObjectId(req.params.recipientId);
    const { recipientType, message, orderId, productId, type } = req.body;

    const notification = new Notification({
      recipientId,
      recipientType,
      message,
      orderId,
      productId,
      type,
    });

    await notification.save();

    res.status(201).json({
      success: true,
      notification,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

// Update a notification by ID
router.put('/:recipientId/:id', catchAsyncErrors(async (req, res, next) => {
  try {
    const recipientId = new ObjectId(req.params.recipientId);
    const notificationId = new ObjectId(req.params.id);
    const updatedNotification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId },
      req.body,
      { new: true }
    );

    if (!updatedNotification) {
      return next(new ErrorHandler('Notification not found', 404));
    }

    res.status(200).json({
      success: true,
      notification: updatedNotification,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

// Search notifications by criteria
router.post('/:recipientId/search', catchAsyncErrors(async (req, res, next) => {
  try {
    const recipientId = new ObjectId(req.params.recipientId);
    const criteria = { ...req.body, recipientId };
    const notifications = await Notification.find(criteria);

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

// Delete all notifications for a recipient
router.delete('/:recipientId/deleteAll', catchAsyncErrors(async (req, res, next) => {
  try {
    const recipientId = new ObjectId(req.params.recipientId);
    await Notification.deleteMany({ recipientId });
    res.status(200).json({
      success: true,
      message: 'All notifications have been deleted',
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

// Delete a notification by ID for a recipient
router.delete('/:recipientId/:id', catchAsyncErrors(async (req, res, next) => {
  try {
    const recipientId = new ObjectId(req.params.recipientId);
    const notificationId = new ObjectId(req.params.id);
    const deletedNotification = await Notification.findOneAndDelete({ _id: notificationId, recipientId });

    if (!deletedNotification) {
      return next(new ErrorHandler('Notification not found', 404));
    }

    res.status(200).json({
      success: true,
      message: 'Notification has been deleted',
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

// Read all notifications for a recipient
router.get('/:recipientId/all', catchAsyncErrors(async (req, res, next) => {
  try {
    const recipientId = new ObjectId(req.params.recipientId);
    const notifications = await Notification.find({ recipientId });
    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

// Read a notification by ID for a recipient
router.get('/:recipientId/notification/:id', catchAsyncErrors(async (req, res, next) => {
  try {
    const recipientId = new ObjectId(req.params.recipientId);
    const notificationId = new ObjectId(req.params.id);
    const notification = await Notification.findOne({ _id: notificationId, recipientId });

    if (!notification) {
      return next(new ErrorHandler('Notification not found', 404));
    }

    res.status(200).json({
      success: true,
      notification,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

// Mark all notifications as read for a recipient
router.put('/:recipientId/markAllRead', catchAsyncErrors(async (req, res, next) => {
  try {
    const recipientId = new ObjectId(req.params.recipientId);
    await Notification.updateMany({ recipientId, read: false }, { $set: { read: true } });
    res.status(200).json({
      success: true,
      message: 'All notifications have been marked as read',
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

// Mark a notification as read by ID for a recipient
router.put('/:recipientId/notification/:id/markRead', catchAsyncErrors(async (req, res, next) => {
  try {
    const recipientId = new ObjectId(req.params.recipientId);
    const notificationId = new ObjectId(req.params.id);
    const updatedNotification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipientId },
      { $set: { read: true } },
      { new: true }
    );

    if (!updatedNotification) {
      return next(new ErrorHandler('Notification not found', 404));
    }

    res.status(200).json({
      success: true,
      notification: updatedNotification,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 500));
  }
}));

module.exports = router;