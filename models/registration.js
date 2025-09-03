const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const registrationSchema = new Schema(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    class: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: true,
    },

    // Payment information
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    paymentAmount: { type: Number, required: true },
    paymentReference: { type: String }, // ZarinPal authority/reference

    // Registration status
    status: {
      type: String,
      enum: ["registered", "cancelled", "completed"],
      default: "registered",
    },

    // Additional information
    notes: { type: String },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
registrationSchema.index({ student: 1, class: 1 }, { unique: true }); // Prevent duplicate registrations
registrationSchema.index({ class: 1 });
registrationSchema.index({ student: 1 });

module.exports = mongoose.model(
  "Registration",
  registrationSchema,
  "registrations"
);
