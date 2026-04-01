const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const classSchema = new Schema(
  {
    title: { type: String, required: true },
    classType: {
      type: String,
      enum: [
        "Free Trial Session",
        "Private 12-Session",
        "Parent & Child",
        "Competition Prep",
        "Free Pool Session",
        "Group Beginner",
        "Advanced Training",
      ],
      required: true,
    },
    description: { type: String },
    duration: { type: Number, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    maxStudents: { type: Number, required: true },
    currentStudents: { type: Number, default: 0 },
    price: { type: Number, required: true },
    instructor: {
      type: String,
      enum: ["Primary Coach", "Secondary Coach", "Both Coaches"],
      required: true,
    },
    location: { type: String, default: "Main Pool" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Class", classSchema, "classes");
