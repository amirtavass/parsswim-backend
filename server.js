// server.js - Railway Optimized with Better Error Handling
const express = require("express");
const cors = require("cors");
const path = require("path");
const passport = require("passport");
const methodOverride = require("method-override");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const flash = require("connect-flash");

// Load environment variables first
require("dotenv").config();
require("app-module-path").addPath(__dirname);

console.log("🚀 Starting ParsSwim API Server...");
console.log("📍 Current working directory:", process.cwd());
console.log("📁 __dirname:", __dirname);

const app = express();

// ✅ RAILWAY FIX: Better error handling for missing modules
let mongoose, MongoStore;
try {
  mongoose = require("mongoose");
  MongoStore = require("connect-mongo");
  console.log("✅ MongoDB modules loaded successfully");
} catch (error) {
  console.error("❌ Failed to load MongoDB modules:", error.message);
  process.exit(1);
}

// ✅ RAILWAY FIX: Better database URL detection
const mongoUrl =
  process.env.MONGODB_URL ||
  process.env.DATABASE_URL ||
  process.env.MONGO_URL ||
  "mongodb://localhost:27017/nodestart";

console.log("🔍 Environment Variables Check:");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("PORT:", process.env.PORT);
console.log("MONGODB_URL exists:", !!process.env.MONGODB_URL);
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
console.log("SESSION_SECRET exists:", !!process.env.SESSION_SECRET);
console.log("Using MongoDB URL:", mongoUrl.replace(/\/\/.*@/, "//***:***@"));

// ✅ RAILWAY FIX: Connect to MongoDB with retry logic
async function connectToDatabase() {
  try {
    console.log("🔌 Attempting to connect to MongoDB...");
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // 10 second timeout
      bufferCommands: false,
    });
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);

    // In Railway, we might want to continue without DB for health checks
    if (process.env.NODE_ENV === "production") {
      console.log("⚠️ Production mode: Starting server without DB connection");
    } else {
      process.exit(1);
    }
  }
}

// Connect to database
connectToDatabase();

// ✅ RAILWAY FIX: Try to load global config safely
let config;
try {
  config = require("./config");
  global.config = config;
  console.log("✅ Config loaded successfully");
} catch (error) {
  console.error("⚠️ Config file not found, using defaults:", error.message);
  config = {
    port: process.env.PORT || 4000,
    debug: process.env.NODE_ENV !== "production",
  };
  global.config = config;
}

// ✅ RAILWAY FIX: Enhanced CORS with better error handling
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000", "https://parsswim.ir", "https://www.parsswim.ir"];

// Add localhost variations for development
if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
  allowedOrigins.push("http://127.0.0.1:3000", "http://localhost:3001");
}

console.log("✅ CORS Allowed Origins:", allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (Railway health checks)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Be more permissive in production for parsswim.ir domains
      if (
        process.env.NODE_ENV === "production" &&
        origin.includes("parsswim.ir")
      ) {
        callback(null, true);
      } else if (process.env.NODE_ENV === "development") {
        callback(null, true);
      } else {
        console.log("❌ CORS blocked origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  exposedHeaders: ["set-cookie"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// Static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Body parsing
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(methodOverride("method"));

// ✅ RAILWAY FIX: Session with better error handling
try {
  app.use(cookieParser(process.env.COOKIE_SECRET || "fallback-secret"));

  const sessionConfig = {
    secret: process.env.SESSION_SECRET || "fallback-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      expires: new Date(Date.now() + 1000 * 3600 * 24 * 7), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      domain:
        process.env.NODE_ENV === "production" ? ".parsswim.ir" : undefined,
    },
  };

  // Only add MongoStore if MongoDB is connected
  if (mongoose.connection.readyState === 1) {
    sessionConfig.store = MongoStore.create({
      mongoUrl: mongoUrl,
      touchAfter: 24 * 3600,
    });
    console.log("✅ Session store configured with MongoDB");
  } else {
    console.log(
      "⚠️ Using memory store for sessions (not recommended for production)"
    );
  }

  app.use(session(sessionConfig));
  console.log("✅ Session middleware configured");
} catch (error) {
  console.error("❌ Session configuration error:", error.message);
  // Continue without sessions in extreme cases
}

app.use(flash());

// ✅ RAILWAY FIX: Passport with error handling
try {
  require("./passport/passportLocal");
  app.use(passport.initialize());
  app.use(passport.session());
  console.log("✅ Passport configured");
} catch (error) {
  console.error("❌ Passport configuration error:", error.message);
  console.log("⚠️ Continuing without passport authentication");
}

// Template engine
app.set("view engine", "ejs");

// Middleware to log requests (simplified for Railway)
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`📨 ${req.method} ${req.path}`);
  }
  next();
});

app.use((req, res, next) => {
  res.locals = { errors: req.flash ? req.flash("errors") : [], req: req };
  next();
});

// ✅ RAILWAY FIX: Enhanced health check for Railway
app.get("/", (req, res) => {
  const dbStatus = mongoose.connection.readyState;
  const dbStatusText =
    {
      0: "Disconnected",
      1: "Connected ✅",
      2: "Connecting",
      3: "Disconnecting",
    }[dbStatus] || "Unknown";

  res.json({
    success: true,
    message: "ParsSwim API is running! 🏊‍♂️",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    database: dbStatusText,
    port: process.env.PORT || 4000,
    nodeVersion: process.version,
    cors: {
      allowedOrigins: allowedOrigins,
      requestOrigin: req.get("origin") || "no-origin",
    },
  });
});

// ✅ RAILWAY FIX: Health check endpoint for Railway
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ✅ RAILWAY FIX: Safe route loading
try {
  app.use("/", require("./routes/index"));
  console.log("✅ Routes loaded successfully");
} catch (error) {
  console.error("❌ Route loading error:", error.message);

  // Basic fallback routes
  app.get("/auth/me", (req, res) => {
    res.status(401).json({ success: false, message: "Not authenticated" });
  });

  app.get("/classes", (req, res) => {
    res.json({
      success: true,
      data: [],
      message: "Service temporarily unavailable",
    });
  });

  app.get("/products", (req, res) => {
    res.json({
      success: true,
      data: [],
      message: "Service temporarily unavailable",
    });
  });
}

// Error handling for 404
app.all("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.path}`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  const code = err.status || 500;
  const message = err.message || "Internal server error";

  console.error(`❌ Error ${code}: ${message}`);

  if (process.env.NODE_ENV === "development") {
    console.error(err.stack);
  }

  res.status(code).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// ✅ RAILWAY FIX: Better port handling
const port = process.env.PORT || 4000;

const server = app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 ParsSwim API server is running on port ${port}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`📊 Memory usage:`, process.memoryUsage());
  console.log(`⏰ Server started at: ${new Date().toISOString()}`);
});

// ✅ RAILWAY FIX: Graceful shutdown
process.on("SIGTERM", () => {
  console.log("🛑 SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("💤 Process terminated");
    mongoose.connection.close(false, () => {
      process.exit(0);
    });
  });
});

process.on("SIGINT", () => {
  console.log("🛑 SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("💤 Process terminated");
    mongoose.connection.close(false, () => {
      process.exit(0);
    });
  });
});

// ✅ RAILWAY FIX: Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("💥 Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

module.exports = app;
