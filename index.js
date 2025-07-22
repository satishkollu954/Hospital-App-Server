require("dotenv").config(); // Load environment variables from .env
const express = require("express");
const cors = require("cors");
const { connectToDatabase } = require("./connection.js");
const app = express();

const userRoute = require("./Routers/user");
const locationRoutes = require("./Routers/locationRoutes");
const staffsRoutes = require("./Routers/staffs");
const dialogflowWebhook = require("./Routers/dialogflowWebhook");

// CORS Setup: Allow frontend URL from Vercel
const allowedOrigins = [
  "https://hospital-app-client-o9y4.vercel.app", // Replace with your actual Vercel URL
  "http://localhost:3000", // For local development (React running on localhost)
];

const corsOptions = {
  origin: (origin, callback) => {
    // Check if the incoming request's origin is in the allowed origins
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true); // Allow the request
    } else {
      callback(new Error("Not allowed by CORS")); // Reject the request
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"], // Allowed methods
  allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
};

app.use(cors(corsOptions)); // Use the customized CORS configuration

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
app.use("/admin", locationRoutes);
app.use("/doctor", staffsRoutes);
app.use("/api", dialogflowWebhook);

// Serve static files
app.use("/uploads", express.static("uploads"));
