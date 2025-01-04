const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: [true, "Please enter your product id!"],
  },
  name: {
    type: String,
    required: [true, "Please enter your product name!"],
  },
  description: {
    type: String,
    required: [true, "Please enter your product description!"],
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  category: {
    type: String,
    required: [true, "Please enter your product category!"],
  },
  subCategory: {
    type: String,
  },
  brand: {
    type: String,
    required: [true, "Please enter your product brand!"],
  },
  tags: {
    type: String,
  },
  barCodeContent: {
    type: String,
  },
  cost: {
    type: Number,
    required: [true, "Please enter your product cost!"],
  },
  originalPrice: {
    type: Number,
  },
  discountPrice: {
    type: Number,
    required: [true, "Please enter your product price!"],
  },
  stock: {
    type: Number,
    required: [true, "Please enter your product stock!"],
  },
  weight: {
    type: Number
  },
  taxCode: {
    type: String
  },
  expiration: {
    type: Date
  },
  images: [
    {
      public_id: {
        type: String,
        required: false,
      },
      url: {
        type: String,
        required: false,
      },
    },
  ],
  reviews: [
    {
      user: {
        type: Object,
      },
      rating: {
        type: Number,
      },
      comment: {
        type: String,
      },
      productId: {
        type: String,
      },
      createdAt:{
        type: Date,
        default: Date.now(),
      }
    },
  ],
  ratings: {
    type: Number,
  },
  shopId: {
    type: String,
    required: true,
  },
  shop: {
    type: Object,
    required: true,
  },
  sold_out: {
    type: Number,
    default: 0,
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Product", productSchema);
