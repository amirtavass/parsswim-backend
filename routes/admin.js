const express = require("express");
const router = express.Router();
const { check } = require("express-validator");

// Controllers
const adminController = require("../controllers/adminController");

// Admin login validation
const adminLoginValidation = [
  check("username", "Username is required").not().isEmpty(),
  check("password", "Password must be at least 5 characters").isLength({
    min: 5,
  }),
];

// Routes
router.post("/login", adminLoginValidation, adminController.login);
router.get("/me", adminController.getCurrentAdmin);
router.post("/logout", adminController.logout);

module.exports = router;
