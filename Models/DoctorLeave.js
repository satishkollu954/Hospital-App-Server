// Models/DoctorLeave.js
const mongoose = require("mongoose");

const doctorLeaveSchema = new mongoose.Schema({
  doctorEmail: { type: String, required: true },
  fromDate: { type: Date, required: true },
  toDate: { type: Date, required: true },
  reason: String,
  status: {
    type: String,
    enum: ["Pending", "Approved", "Rejected"],
    default: "Pending",
  },
  requestedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("DoctorLeave", doctorLeaveSchema);
