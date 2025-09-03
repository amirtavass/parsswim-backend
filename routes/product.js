const express = require("express");
const router = express.Router();

// Controllers
const productController = require("../controllers/productController");

// Validators
const productValidator = require("../validators/productValidator");

// Middleware for admin-only routes
const adminOnly = (req, res, next) => {
  // Check for admin session (consistent with class routes)
  if (req.session.isAdmin && req.session.adminId) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Access denied. Admin privileges required.",
  });
};

// Public routes (no authentication required)
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getOneProduct);

// Admin-only routes - FIXED: Use consistent admin middleware
router.post(
  "/",
  adminOnly,
  productValidator.handle(),
  productController.createProduct
);
router.put(
  "/:id",
  adminOnly,
  productValidator.handle(),
  productController.updateProduct
);
router.delete("/:id", adminOnly, productController.deleteProduct);

module.exports = router;
