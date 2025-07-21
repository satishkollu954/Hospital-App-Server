const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema({
  name: String,
  mapUrl: String,
  phone: String,
});

const hospitalLocationSchema = new mongoose.Schema({
  State: {
    type: String,
    required: true,
  },
  branches: [branchSchema],
});

const HospitalLocation = mongoose.model(
  "HospitalLocation",
  hospitalLocationSchema
);

module.exports = HospitalLocation;
