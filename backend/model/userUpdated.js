const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userUpdatedSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  email: {
    type: String,
    required: [true, "Please enter your email address"],
    unique: true
  },
  password: {
    type: String,
    minLength: [6, "Password should be greater than 6 characters"],
    select: false,
  },
  address: {
    type: String,
  },
  cardDetails: {
    cardNumber: { type: String },
    expiryDate: { type: String },
    cvv: { type: String }
  },
  role: {
    type: String,
    default: "user",
  },
  avatar: {
    type: String,
    required: false,
  },
  createdAt: {
    type: Date,
    default: Date.now(),
  },
  resetPasswordToken: String,
  resetPasswordTime: Date,
});

// Hash password
userUpdatedSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  this.password = await bcrypt.hash(this.password, 10);
});

// jwt token
userUpdatedSchema.methods.getJwtToken = function () {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET_KEY, {
    expiresIn: process.env.JWT_EXPIRES,
  });
};

// comapre password
userUpdatedSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("UserV1", userUpdatedSchema);
