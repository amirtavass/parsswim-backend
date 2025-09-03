const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    age: { type: Number },
    balance: { type: Number, required: true },

    // Swimming-specific fields
    swimmingType: {
      type: String,
      enum: ["normal", "competition"],
      required: true,
      default: "normal",
    },
    skillLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: "beginner",
    },

    // User management
    img: { type: String }, // Profile image
    role: {
      type: String,
      enum: ["student", "admin"],
      default: "student",
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

module.exports = mongoose.model("User", userSchema, "users");
