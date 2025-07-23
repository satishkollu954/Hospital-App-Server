require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { connectToDatabase } = require("./connection.js");

const app = express();

// Routes
const userRoute = require("./Routers/user");
const locationRoutes = require("./Routers/locationRoutes");
const staffsRoutes = require("./Routers/staffs");
const dialogflowWebhook = require("./Routers/dialogflowWebhook");

// ✅ Fix: Allow requests with no origin (like Dialogflow Messenger)
const allowedOrigins = [
  "https://hospital-app-client-o9y4.vercel.app",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || origin === "null") {
        callback(null, true);
      } else {
        console.log("❌ Blocked by CORS:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ✅ Body parsers
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// ✅ Routes
app.use("/api", dialogflowWebhook); // Webhook route
app.use("/api", userRoute);
app.use("/admin", locationRoutes);
app.use("/doctor", staffsRoutes);

// ✅ Static files
app.use("/uploads", express.static("uploads"));

// ✅ Connect DB
connectToDatabase(process.env.MONGO_URI);

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
