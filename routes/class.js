const express = require("express");
const router = express.Router();

// Controllers
const classController = require("../controllers/classController");

// Validators
const classValidator = require("../validators/classValidator");

// Middleware for admin-only routes
const adminOnly = (req, res, next) => {
  // Check for admin session (not user session)
  if (req.session.isAdmin && req.session.adminId) {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: "Access denied. Admin privileges required.",
  });
};

// Public routes (no authentication required)
router.get("/", classController.getAllClasses);
router.get("/available", classController.getAvailableClasses);
router.get("/:id", classController.getOneClass);

// Admin-only routes - FIXED: Use proper admin middleware
router.post(
  "/",
  adminOnly,
  classValidator.handle(),
  classController.createClass
);
router.put(
  "/:id",
  adminOnly,
  classValidator.handle(),
  classController.updateClass
);
router.delete("/:id", adminOnly, classController.deleteClass);

module.exports = router;
