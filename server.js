// server.js - Enhanced with missing routes but still minimal
const express = require("express");
const cors = require("cors");

require("dotenv").config();

console.log("🚀 Starting ParsSwim API Server...");

const app = express();
const port = process.env.PORT || 3000;

// CORS
const corsOptions = {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Health checks
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "ParsSwim API is running on Railway!",
    timestamp: new Date().toISOString(),
    port: port,
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy", uptime: process.uptime() });
});

app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// ✅ Auth routes that frontend expects
app.get("/auth/me", (req, res) => {
  res.status(401).json({
    success: false,
    message: "Not authenticated",
  });
});

app.post("/auth/login", (req, res) => {
  res.status(401).json({
    success: false,
    message: "Auth service temporarily unavailable",
  });
});

app.post("/auth/register", (req, res) => {
  res.status(400).json({
    success: false,
    message: "Registration service temporarily unavailable",
  });
});

app.post("/auth/logout", (req, res) => {
  res.json({
    success: true,
    message: "Logged out",
  });
});

// ✅ Admin routes that frontend expects
app.get("/admin/me", (req, res) => {
  res.status(401).json({
    success: false,
    message: "Not authenticated as admin",
  });
});

app.post("/admin/login", (req, res) => {
  res.status(401).json({
    success: false,
    message: "Admin service temporarily unavailable",
  });
});

app.post("/admin/logout", (req, res) => {
  res.json({
    success: true,
    message: "Admin logged out",
  });
});

// ✅ Classes routes
app.get("/classes", (req, res) => {
  res.json({
    success: true,
    data: [],
    message: "Classes service loading...",
  });
});

app.get("/classes/available", (req, res) => {
  res.json({
    success: true,
    data: [],
    message: "Available classes service loading...",
  });
});

app.get("/classes/:id", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Class not found",
  });
});

// ✅ Products routes
app.get("/products", (req, res) => {
  res.json({
    success: true,
    data: [],
    message: "Products service loading...",
  });
});

app.get("/products/:id", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Product not found",
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
      .then(() => {
        console.log("✅ MongoDB connected - ready to add real data");
        // TODO: Add real route handlers here once DB is connected
      })
      .catch((err) => console.log("⚠️ MongoDB failed:", err.message));
  }
} catch (error) {
  console.log("⚠️ Mongoose not available:", error.message);
}

// ✅ 404 handler
app.use("*", (req, res) => {
  console.log("404:", req.method, req.originalUrl);
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

// ✅ Start server
const server = app.listen(port, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV}`);
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
