// let users = require("./../users");
const express = require("express");
const router = express.Router();
const uploadUserProfile = require("upload/uploadUserProfile");

//controllers
const dashboardController = require("../controllers/dashboardController");

//validator
const editUserValidator = require("validators/editUserValidator");

router.use((req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
});

router.get("/", dashboardController.index);

router.post(
  "/edituser",
  uploadUserProfile.single("img"),
  editUserValidator.validateFile(), // Custom file validation
  editUserValidator.handle(), // Regular validation
  dashboardController.edituser
);

router.post("/pay", dashboardController.pay);
module.exports = router;
