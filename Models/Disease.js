const mongoose = require("mongoose");

const diseaseSchema = new mongoose.Schema({
  disease: String,
  description: String,
  learnmore: String,
});

module.exports = mongoose.model("Disease", diseaseSchema);
