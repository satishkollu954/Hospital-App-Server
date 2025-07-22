require("dotenv").config(); // Load environment variables from .env
const express = require("express");
const cors = require("cors");
const { connectToDatabase } = require("./connection.js");

const app = express();

// Routes
const userRoute = require("./Routers/user");
const locationRoutes = require("./Routers/locationRoutes");
const staffsRoutes = require("./Routers/staffs");
const dialogflowWebhook = require("./Routers/dialogflowWebhook");

// Middleware to parse JSON and URL-encoded data
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ✅ Webhook route for Dialogflow — NO CORS here (Dialogflow doesn't send origin)
app.use("/api", dialogflowWebhook);

// ✅ CORS configuration for frontend (React on Vercel)
const allowedOrigins = [
  "https://hospital-app-client-o9y4.vercel.app", // your frontend
  "http://localhost:3000", // local dev
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// ✅ CORS applied only to frontend-facing routes
app.use("/api", cors(corsOptions), userRoute);
app.use("/admin", cors(corsOptions), locationRoutes);
app.use("/doctor", cors(corsOptions), staffsRoutes);

// ✅ Serve static files
app.use("/uploads", express.static("uploads"));

// ✅ Connect to MongoDB
connectToDatabase(process.env.MONGO_URI);

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
