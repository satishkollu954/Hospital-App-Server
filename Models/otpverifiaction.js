const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  Email: String,
  Otp: String,
});

module.exports = mongoose.model("EmailWithOtp", otpSchema);
