const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const articleSchema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },

    // Article categorization
    category: {
      type: String,
      enum: [
        "کرال سینه", // Freestyle
        "کرال پشت", // Backstroke
        "پروانه", // Butterfly
        "قورباغه", // Breaststroke
        "ایمنی", // Safety
        "فواید شنا", // Benefits of swimming
      ],
      required: true,
    },

    // Article management
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }, // Reference to admin user who created it

    // Images for article
    featuredImage: { type: String }, // Main article image
    images: [{ type: String }], // Additional images array

    // Publication settings
    isPublished: { type: Boolean, default: false },
    publishDate: { type: Date },

    // SEO and metadata
    summary: { type: String, maxlength: 300 }, // Short description for listing
    tags: [{ type: String }], // Optional tags for search

    // Reading stats (optional for later)
    viewCount: { type: Number, default: 0 },
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Index for better performance
articleSchema.index({ category: 1, isPublished: 1 });
articleSchema.index({ publishDate: -1 });

module.exports = mongoose.model("Article", articleSchema, "articles");
