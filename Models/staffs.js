const mongoose = require("mongoose");

const StaffSchema = new mongoose.Schema({
  Email: String,
  Password: String,
  Otp: String,
});

module.exports = mongoose.model("Staffs", StaffSchema);
