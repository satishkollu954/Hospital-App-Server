const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  fullName: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: [
      /^[a-zA-Z0-9._%+-]+@gmail\.com$/,
      "Invalid email format. Only @gmail.com addresses allowed.",
    ],
  },
  phone: {
    type: String,
  },
  date: {
    type: Date,
  },
  reason: {
    type: String,
  },
  status: {
    type: String,
    enum: ["Started", "In Progress", "Completed", "Pending"],
    default: "Pending",
  },
  disease: {
    type: String,
  },
  state: {
    type: String,
  },
  city: {
    type: String,
  },
  doctor: {
    type: String,
  },
  doctorEmail: {
    type: String,
    required: true,
  },
  time: String,

  rescheduleToken: String, // one‑time link id
  rescheduleExpires: Date, // expiry (e.g. 24 h)
});

const appointmentModel = mongoose.model("Appointments", appointmentSchema);

module.exports = {
  appointmentModel,
};
