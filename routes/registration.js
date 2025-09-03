const express = require("express");
const router = express.Router();
const { check } = require("express-validator");

// Controllers
const registrationController = require("../controllers/registrationController");

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: "Authentication required",
  });
};

// Simple validation
const validateRegistration = [
  check("classId", "Class ID is required").not().isEmpty(),
];

// Routes
router.post(
  "/",
  /*requireAuth,*/
  validateRegistration,
  registrationController.registerForClass
);
router.get("/payment-callback", registrationController.paymentCallback);
router.get("/my", /*requireAuth,*/ registrationController.getMyRegistrations);

module.exports = router;
