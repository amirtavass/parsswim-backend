const express = require("express");
const router = express.Router();
const axios = require("axios");
const payment = require("../models/payment");

// Simple cart payment endpoint for sandbox testing
router.post("/cart", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { items, totalAmount } = req.body;

    let params = {
      merchant_id: "12345678-1234-1234-1234-123456789012",
      amount: totalAmount,
      callback_url: "http://localhost:4000/paycallback",
      description: "Cart purchase - sandbox test",
    };

    const response = await axios.post(
      "https://sandbox.zarinpal.com/pg/v4/payment/request.json",
      params
    );

    if (response.data.data && response.data.data.code === 100) {
      // Save payment record
      let newPayment = new payment({
        user: req.user.id,
        amount: totalAmount,
        resnumber: response.data.data.authority,
      });
      await newPayment.save();

      return res.json({
        success: true,
        paymentUrl: `https://sandbox.zarinpal.com/pg/StartPay/${response.data.data.authority}`,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: "Payment initiation failed",
      });
    }
  } catch (err) {
    console.error("Cart payment error:", err);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// Cart payment callback
router.get("/cart-callback", async (req, res) => {
  try {
    if (req.query.Status && req.query.Status !== "OK") {
      return res.redirect("/cart?payment=failed");
    }

    let paymentRecord = await payment.findOne({
      resnumber: req.query.Authority,
    });

    if (!paymentRecord) {
      return res.redirect("/cart?payment=notfound");
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

    if (
      response.data.data &&
      (response.data.data.code === 100 || response.data.data.code === 101)
    ) {
      paymentRecord.payment = true;
      await paymentRecord.save();

      // In a real app, you'd process the cart items here
      res.redirect("/dashboard?payment=success&type=cart");
    } else {
      res.redirect("/cart?payment=failed");
    }
  } catch (err) {
    console.error("Cart payment callback error:", err);
    res.redirect("/cart?payment=error");
  }
});

module.exports = router;
