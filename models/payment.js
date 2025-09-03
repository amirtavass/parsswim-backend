const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const PaymentSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "User" },
  amount: { type: Number, required: true },
  resnumber: { type: String, required: true },
  payment: { type: Boolean, default: false },
});
module.exports = mongoose.model("payment", PaymentSchema, "payment");
