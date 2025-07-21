const mongoose = require("mongoose");

const educationSchema = new mongoose.Schema({
  degree: String,
  institution: String,
  year: String,
});

const doctorSchema = new mongoose.Schema({
  image: String,
  Name: String,
  About: String,
  Email: String,
  Password: String,
  Designation: String,
  Specialization: String,
  Age: Number,
  State: String,
  City: String,
  Availability: Boolean,
  unavailableSince: Date,
  From: String, // e.g., "10:00 AM"
  To: String, // e.g., "06:00 PM"
  Learnmore: String,

  Qualification: String,
  Experience: String,
  BriefProfile: String,
  Address: String,
  Languages: [String], // e.g., ["English", "Hindi", "Telugu"]
  Education: [educationSchema],
});

module.exports = mongoose.model("Doctor", doctorSchema);
