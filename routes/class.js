const express = require("express");
const router = express.Router();

// Controllers
const classController = require("../controllers/classController");

// Validators
const classValidator = require("../validators/classValidator");

// JWT-based admin middleware
const adminJwt = require("../middlewares/adminJwt");

// Public routes (no authentication required)
router.get("/", classController.getAllClasses);
router.get("/available", classController.getAvailableClasses);
router.get("/:id", classController.getOneClass);

// Admin-only routes - FIXED: Use proper admin middleware
router.post(
  "/",
  adminJwt,
  classValidator.handle(),
  classController.createClass
);
router.put(
  "/:id",
  adminJwt,
  classValidator.handle(),
  classController.updateClass
);
router.delete(":id", adminJwt, classController.deleteClass);

module.exports = router;
