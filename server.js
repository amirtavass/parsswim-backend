// server.js - Minimal Railway-Compatible Version
const express = require("express");
const cors = require("cors");

// Load environment first
require("dotenv").config();

console.log("🚀 Starting ParsSwim API Server...");
console.log("Environment:", process.env.NODE_ENV);
console.log("Railway PORT:", process.env.PORT);

const app = express();

// ✅ CRITICAL: Let Railway control the PORT - don't override it
const port = process.env.PORT || 3000;

// ✅ Basic CORS - allow all for now
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ✅ Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Railway Health Check - MUST respond on /
app.get("/", (req, res) => {
  console.log("Health check requested");
  res.status(200).json({
    success: true,
    message: "ParsSwim API is running on Railway!",
    timestamp: new Date().toISOString(),
    port: port,
    environment: process.env.NODE_ENV || "development",
  });
});

// ✅ Additional health endpoints
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    uptime: process.uptime(),
  });
});

app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// ✅ Basic API endpoints (no complex dependencies)
app.get("/auth/me", (req, res) => {
  res.status(401).json({
    success: false,
    message: "Not authenticated",
  });
});

app.post("/auth/login", (req, res) => {
  res.json({
    success: false,
    message: "Auth service temporarily unavailable",
  });
});

app.post("/auth/register", (req, res) => {
  res.json({
    success: false,
    message: "Registration service temporarily unavailable",
  });
});

app.get("/classes", (req, res) => {
  res.json({
    success: true,
    data: [],
    message: "Classes service loading...",
  });
});

app.get("/products", (req, res) => {
  res.json({
    success: true,
    data: [],
    message: "Products service loading...",
  });
});

// ✅ Database connection (non-blocking)
let mongoose;
try {
  mongoose = require("mongoose");
  const mongoUrl = process.env.MONGODB_URL;

  if (mongoUrl) {
    mongoose
      .connect(mongoUrl)
      .then(() => console.log("✅ MongoDB connected"))
      .catch((err) => console.log("⚠️ MongoDB failed:", err.message));
  } else {
    console.log("⚠️ No MongoDB URL provided");
  }
} catch (error) {
  console.log("⚠️ Mongoose not available:", error.message);
}

// ✅ 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    error: "Not Found",
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// ✅ Error handler
app.use((error, req, res, next) => {
  console.error("Error:", error.message);
  res.status(500).json({
    error: "Internal Server Error",
    message: error.message,
  });
});

// ✅ CRITICAL: Listen on 0.0.0.0 with Railway's PORT
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV}`);
  console.log(`✅ Listening on 0.0.0.0:${port}`);
});

// ✅ Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down");
  server.close(() => process.exit(0));
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down");
  server.close(() => process.exit(0));
});

module.exports = app;
