const mongoose = require("mongoose");
const connectToDatabase = async (url) => {
  try {
    await mongoose.connect(url);
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Database connection error:", error);
  }
};
module.exports = { connectToDatabase };
