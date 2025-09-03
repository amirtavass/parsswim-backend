const { validationResult } = require("express-validator");
let controller = require("./controller");
const User = require("../models/user");
const axios = require("axios");
const payment = require("../models/payment");

module.exports = new (class DashboardController extends controller {
  async index(req, res, next) {
    try {
      res.render("dashboard/index");
    } catch (err) {
      next(err);
    }
  }

  async pay(req, res, next) {
    try {
      let params = {
        merchant_id: "12345678-1234-1234-1234-123456789012",
        amount: req.body.amount,
        callback_url: "http://localhost:4000/paycallback",
        description: "charging balance - sandbox test",
      };

      const response = await axios.post(
        "https://sandbox.zarinpal.com/pg/v4/payment/request.json",
        params
      );

      console.log("Sandbox payment response:", response.data);

      // FIX: Check the correct response structure for sandbox
      if (response.data.data && response.data.data.code === 100) {
        let newPayment = new payment({
          user: req.user.id,
          amount: req.body.amount,
          resnumber: response.data.data.authority, // Authority from data.authority
        });
        await newPayment.save();
        res.redirect(
          `https://sandbox.zarinpal.com/pg/StartPay/${response.data.data.authority}`
        );
      } else {
        console.error("Payment request failed:", response.data);
        res.send("خطا در ایجاد درخواست پرداخت");
      }
    } catch (err) {
      console.error("Payment error:", err);
      next(err);
    }
  }

  async edituser(req, res, next) {
    try {
      console.log("req.body:", req.body);
      console.log("req.file:", req.file);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        let myErrors = errors.array().map((err) => err.msg);
        req.flash("errors", myErrors);
        return res.redirect("/dashboard");
      }

      let data = {
        name: req.body.name,
      };

      if (req.file) {
        data.img = req.file.path.replace(/\\/g, "/").substring(6);
        console.log("Image path set:", data.img);
      }

      console.log("Update data:", data);
      console.log("User ID:", req.body.id);

      const result = await User.updateOne({ _id: req.body.id }, { $set: data });
      console.log("Update result:", result);

      res.redirect("/dashboard");
    } catch (err) {
      console.error("Error in edituser:", err);
      next(err);
    }
  }
})();
