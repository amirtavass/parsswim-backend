const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const classSchema = new Schema(
  {
    title: { type: String, required: true },

    // Class type categorization
    classType: {
      type: String,
      enum: [
        "کلاس خصوصی ۱۲ جلسه", // 12-Session Private Class
        "کلاس پدر و فرزند", // Parent & Child Class
        "کلاس آمادگی مسابقات", // Competition Preparation Class
        "سانس آزاد استخر", // Free Pool Session
        "جلسه آزمایشی رایگان", // Free Trial Session
      ],
      required: true,
    },

    // Class details
    description: { type: String },
    duration: { type: Number, required: true }, // Duration in minutes
    skillLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "all"],
      default: "all",
    },

    // Scheduling
    date: { type: Date, required: true },
    time: { type: String, required: true }, // e.g., "14:00" or "2:00 PM"

    // Capacity management
    maxStudents: { type: Number, required: true },
    currentStudents: { type: Number, default: 0 },

    // Pricing
    price: { type: Number, required: true }, // Price in Toman

    // Access control
    requiresRegistration: {
      type: Boolean,
      default: true,
    }, // False for سانس آزاد استخر and جلسه آزمایشی

    // Class management
    instructor: {
      type: String,
      enum: ["مربی اول", "مربی دوم", "هر دو مربی"],
      required: true,
    }, // Coach assignment
    location: { type: String, default: "استخر اصلی" }, // Pool location
    isActive: { type: Boolean, default: true },

    // Additional info
    notes: { type: String }, // Special instructions or requirements
    equipment: [{ type: String }], // Required equipment list
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
classSchema.index({ date: 1, time: 1 });
classSchema.index({ classType: 1, isActive: 1 });
classSchema.index({ date: 1, isActive: 1 });

// Virtual for available spots
classSchema.virtual("availableSpots").get(function () {
  return this.maxStudents - this.currentStudents;
});

// Virtual for is full
classSchema.virtual("isFull").get(function () {
  return this.currentStudents >= this.maxStudents;
});

module.exports = mongoose.model("Class", classSchema, "classes");
