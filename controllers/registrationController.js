const { validationResult } = require("express-validator");
const Registration = require("../models/registration");
const Class = require("../models/class");
const User = require("../models/user");
const payment = require("../models/payment");
const axios = require("axios");
let controller = require("./controller");

class RegistrationController extends controller {
  async registerForClass(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map((err) => err.msg),
          message: "Validation failed",
        });
      }

      const { classId } = req.body;
      const userId = req.user ? req.user.id : "507f1f77bcf86cd799439012";

      const classItem = await Class.findById(classId);
      if (!classItem) {
        return res.status(404).json({
          success: false,
          message: "Class not found",
        });
      }

      if (classItem.currentStudents >= classItem.maxStudents) {
        return res.status(400).json({
          success: false,
          message: "Class is full",
        });
      }

      const existingRegistration = await Registration.findOne({
        student: userId,
        class: classId,
      });

      if (existingRegistration) {
        return res.status(400).json({
          success: false,
          message: "Already registered for this class",
        });
      }

      // For free classes, register directly
      if (classItem.price === 0) {
        const newRegistration = new Registration({
          student: userId,
          class: classId,
          paymentAmount: 0,
          paymentStatus: "paid",
          status: "registered",
        });

        await newRegistration.save();
        await Class.findByIdAndUpdate(classId, {
          $inc: { currentStudents: 1 },
        });

        return res.status(201).json({
          success: true,
          data: newRegistration,
          message: "Successfully registered for free class",
        });
      }

      // For paid classes, initiate sandbox payment
      let params = {
        merchant_id: "12345678-1234-1234-1234-123456789012",
        amount: classItem.price,
        callback_url: "http://localhost:4000/registrations/payment-callback",
        description: `Registration for ${classItem.title} - sandbox test`,
      };

      const response = await axios.post(
        "https://sandbox.zarinpal.com/pg/v4/payment/request.json",
        params
      );

      console.log("Class payment request response:", response.data);

      // FIX: Check correct response structure
      if (response.data.data && response.data.data.code === 100) {
        const newRegistration = new Registration({
          student: userId,
          class: classId,
          paymentAmount: classItem.price,
          paymentReference: response.data.data.authority, // From data.authority
          paymentStatus: "pending",
          status: "registered",
        });

        await newRegistration.save();

        let newPayment = new payment({
          user: userId,
          amount: classItem.price,
          resnumber: response.data.data.authority, // From data.authority
        });
        await newPayment.save();

        return res.json({
          success: true,
          paymentUrl: `https://sandbox.zarinpal.com/pg/StartPay/${response.data.data.authority}`,
          message: "Payment initiated. Redirecting to payment gateway.",
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "Payment initiation failed",
        });
      }
    } catch (err) {
      console.error("Class registration error:", err);
      next(err);
    }
  }

  async paymentCallback(req, res, next) {
    try {
      console.log("Class payment callback received:", req.query);

      if (req.query.Status && req.query.Status !== "OK") {
        return res.redirect("/dashboard?payment=failed");
      }

      const registration = await Registration.findOne({
        paymentReference: req.query.Authority,
      });

      if (!registration) {
        return res.redirect("/dashboard?payment=notfound");
      }

      let params = {
        merchant_id: "12345678-1234-1234-1234-123456789012",
        amount: registration.paymentAmount,
        authority: req.query.Authority,
      };

      const response = await axios.post(
        "https://sandbox.zarinpal.com/pg/v4/payment/verify.json",
        params
      );

      console.log("Class payment verification response:", response.data);

      // FIX: Check correct verification response structure
      if (
        response.data.data &&
        (response.data.data.code === 100 || response.data.data.code === 101)
      ) {
        registration.paymentStatus = "paid";
        await registration.save();

        const paymentRecord = await payment.findOne({
          resnumber: req.query.Authority,
        });
        if (paymentRecord) {
          paymentRecord.payment = true;
          await paymentRecord.save();
        }

        await Class.findByIdAndUpdate(registration.class, {
          $inc: { currentStudents: 1 },
        });

        res.redirect("/dashboard?payment=success");
      } else {
        registration.paymentStatus = "failed";
        await registration.save();
        res.redirect("/dashboard?payment=failed");
      }
    } catch (err) {
      console.error("Class payment callback error:", err);
      next(err);
    }
  }

  async getMyRegistrations(req, res, next) {
    try {
      const registrations = await Registration.find({
        student: req.user ? req.user.id : "507f1f77bcf86cd799439012",
      })
        .populate("class", "title date time classType instructor location")
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        data: registrations,
        message: "Registrations retrieved successfully",
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RegistrationController();
