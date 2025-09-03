const express = require("express");
const router = express.Router();

// Controllers
const authController = require("../controllers/authController");

// Validations
const authValidator = require("../validators/authValidator");

// API Routes - no view rendering since we're using Next.js
router.post("/login", authValidator.login(), authController.login);
router.post("/register", authValidator.register(), authController.register);
router.post("/logout", authController.logout);
router.get("/check", authController.checkAuth);
router.get("/me", authController.getCurrentUser);
router.post("/logout", authController.logout);

module.exports = router;
