const express = require("express");
const router = express.Router();

// Controllers
const productController = require("../controllers/productController");

// Validators
const productValidator = require("../validators/productValidator");

// JWT-based admin middleware
const adminJwt = require("../middlewares/adminJwt");

// Public routes (no authentication required)
router.get("/", productController.getAllProducts);
router.get("/:id", productController.getOneProduct);

// Admin-only routes - FIXED: Use JWT admin middleware
router.post(
  "/",
  adminJwt,
  productValidator.handle(),
  productController.createProduct
);
router.put(
  "/:id",
  adminJwt,
  productValidator.handle(),
  productController.updateProduct
);
router.delete("/:id", adminJwt, productController.deleteProduct);

module.exports = router;
