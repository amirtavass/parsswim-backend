const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const productSchema = new Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },

    // Product categorization
    category: {
      type: String,
      enum: ["swimwear", "swimgoggles", "swimfins", "swimequipment"],
      required: true,
    },

    // Product details
    description: { type: String },
    image: { type: String }, // Product image path
    images: [{ type: String }], // Additional images

    // Inventory
    inStock: { type: Boolean, default: true },
    quantity: { type: Number, default: 0 },

    // Product management
    isActive: { type: Boolean, default: true },

    // Additional info
    brand: { type: String },
    size: { type: String },
    color: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ name: 1 });

module.exports = mongoose.model("Product", productSchema, "products");
