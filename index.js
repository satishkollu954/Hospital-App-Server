require("dotenv").config(); // Load environment variables from .env
const express = require("express");
const cors = require("cors");
const { connectToDatabase } = require("./connection.js");
const app = express();

const userRoute = require("./Routers/user");
const locationRoutes = require("./Routers/locationRoutes");
const staffsRoutes = require("./Routers/staffs");
const chatBotRoutes = require("./Routers/chatbot");
const dialogflowWebhook = require("./Routers/dialogflowWebhook");

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Connect to MongoDB
connectToDatabase(process.env.MONGO_URI);

// Routes
app.use("/api", userRoute);
app.use("/api", chatBotRoutes);
app.use("/admin", locationRoutes);
app.use("/doctor", staffsRoutes);
app.use("/api", dialogflowWebhook);

// Serve static files
app.use("/uploads", express.static("uploads"));
