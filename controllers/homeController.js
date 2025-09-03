const { validationResult } = require("express-validator");
let User = require("models/user");
let controller = require("./controller");
const payment = require("../models/payment");
const axios = require("axios");

class UserController extends controller {
  async paycallback(req, res, next) {
    try {
      console.log("Payment callback received:", req.query);

      if (req.query.Status && req.query.Status !== "OK") {
        return res.send("تراکنش ناموفق");
      }

      let paymentRecord = await payment.findOne({
        resnumber: req.query.Authority,
      });

      if (!paymentRecord) {
        return res.send("همچنین تراکنشی وجود ندارد");
      }

      let params = {
        merchant_id: "12345678-1234-1234-1234-123456789012",
        amount: paymentRecord.amount,
        authority: req.query.Authority,
      };

      const response = await axios.post(
        "https://sandbox.zarinpal.com/pg/v4/payment/verify.json",
        params
      );

      console.log("Verification response:", response.data);

      // FIX: Check correct response structure for verification
      if (
        response.data.data &&
        (response.data.data.code === 100 || response.data.data.code === 101)
      ) {
        let balance = paymentRecord.amount;
        let user = await User.findById(paymentRecord.user);
        if (user.balance) {
          balance += user.balance;
        }
        user.balance = balance;
        paymentRecord.payment = true;
        await user.save();
        await paymentRecord.save();
        res.redirect("/dashboard");
      } else {
        return res.send("تراکنش ناموفق");
      }
    } catch (err) {
      console.error("Payment callback error:", err);
      next(err);
    }
  }
}

module.exports = new UserController();
