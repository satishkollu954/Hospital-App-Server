const mongoose = require("mongoose");

const contactSchema = new mongoose.Schema({
  fullName: {
    type: String,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },

  // ✅ new field
  contact: {
    type: String,
  },
  message: {
    type: String,
  },
});
const contactModel = mongoose.model("ContactUs", contactSchema);

module.exports = {
  contactModel,
};
