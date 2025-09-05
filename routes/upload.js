const express = require("express");
const router = express.Router();
const uploadUserProfile = require("upload/uploadUserProfile");

// Admin middleware - ensure only admins can upload product images
const requireAdmin = (req, res, next) => {
  if (req.session.isAdmin && req.session.adminId) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Admin access required",
  });
};

// POST /upload/product - Upload product image
router.post("/product", requireAdmin, (req, res) => {
  // Use multer middleware with proper error handling
  const upload = uploadUserProfile.single("image");

  upload(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({
        success: false,
        message: "File upload error: " + err.message,
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image file provided",
        });
      }

      console.log("File uploaded successfully:", req.file);

      // FIXED: Return proper image path like the old version
      // Remove 'public' from path and ensure single leading slash
      let imagePath = req.file.path.replace(/\\/g, "/").substring(6); // Remove 'public'

      // Ensure path starts with single slash
      if (!imagePath.startsWith("/")) {
        imagePath = "/" + imagePath;
      }

      console.log("Final image path:", imagePath);

      res.json({
        success: true,
        imagePath: imagePath, // Return clean path like: /uploads/images/filename.jpg
        message: "Image uploaded successfully",
        file: {
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
      });
    } catch (error) {
      console.error("Upload processing error:", error);
      res.status(500).json({
        success: false,
        message: "Upload processing failed: " + error.message,
      });
    }
  });
});

module.exports = router;
