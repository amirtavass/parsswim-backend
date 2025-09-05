// server.js - CORS section update
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

const app = express();

// Mongoose and MongoStore
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");

// Better database connection handling
const mongoUrl =
  process.env.MONGODB_URL ||
  process.env.DATABASE_URL ||
  "mongodb://localhost:27017/nodestart";

console.log("🔍 Environment check:");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("MONGODB_URL exists:", !!process.env.MONGODB_URL);
console.log("DATABASE_URL exists:", !!process.env.DATABASE_URL);
console.log("Using MongoDB URL:", mongoUrl.replace(/\/\/.*@/, "//***:***@"));

// Connect to MongoDB with better error handling
mongoose
  .connect(mongoUrl)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  });

// Global config
global.config = require("./config");

// ENHANCED CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000", "https://parsswim.ir"];

// Add localhost variations
if (!process.env.NODE_ENV || process.env.NODE_ENV === "development") {
  allowedOrigins.push("http://127.0.0.1:3000");
  allowedOrigins.push("http://localhost:3001");
  allowedOrigins.push("http://127.0.0.1:3001");
}

console.log("✅ CORS Allowed Origins:", allowedOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) {
      console.log("⚠️ Request with no origin header - allowing");
      return callback(null, true);
    }

    console.log("🔍 Request origin:", origin);

    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log("✅ Origin allowed:", origin);
      callback(null, true);
    } else {
      console.log("❌ CORS blocked origin:", origin);
      // In development, you might want to allow all origins
      if (process.env.NODE_ENV === "development") {
        console.log("⚠️ Development mode - allowing blocked origin");
        callback(null, true);
      } else {
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

// Handle preflight requests
app.options("*", cors(corsOptions));

// Static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Body parsing
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(methodOverride("method"));

// Session configuration - IMPORTANT: Update for cross-domain cookies
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      expires: new Date(Date.now() + 1000 * 3600 * 24 * 7), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Important for cross-domain
      domain:
        process.env.NODE_ENV === "production" ? ".parsswim.ir" : undefined, // Allow subdomain access
    },
    store: MongoStore.create({
      mongoUrl: mongoUrl,
      touchAfter: 24 * 3600,
    }),
  })
);

app.use(flash());

// Passport configuration
require("./passport/passportLocal");
app.use(passport.initialize());
app.use(passport.session());

// Template engine
app.set("view engine", "ejs");

// Middleware to log all requests
app.use((req, res, next) => {
  console.log(
    `📨 ${req.method} ${req.path} from ${req.get("origin") || "no-origin"}`
  );
  next();
});

app.use((req, res, next) => {
  res.locals = { errors: req.flash("errors"), req: req };
  next();
});

// Health check endpoint with more info
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ParsSwim API is running! 🏊‍♂️",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    database:
      mongoose.connection.readyState === 1 ? "Connected ✅" : "Disconnected ❌",
    cors: {
      allowedOrigins: allowedOrigins,
      requestOrigin: req.get("origin") || "no-origin",
    },
    headers: {
      host: req.get("host"),
      origin: req.get("origin"),
      referer: req.get("referer"),
    },
  });
});

// API routes
app.use("/", require("./routes/index"));

// Error handling for 404
app.all(/.*/, (req, res, next) => {
  console.log(`⚠️ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.path}`,
    availableEndpoints: [
      "GET /",
      "POST /auth/login",
      "POST /auth/register",
      "GET /classes",
      "GET /products",
      // Add more endpoints here
    ],
  });
});

// Global error handler
app.use(async (err, req, res, next) => {
  const code = err.status || 500;
  const message = err.message || "Internal server error";

  console.error(`❌ Error ${code}: ${message}`);
  console.error(err.stack);

  res.status(code).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Use Railway's PORT or fallback
const port = process.env.PORT || 4000;

app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 ParsSwim API server is running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Database: ${mongoUrl.replace(/\/\/.*@/, "//***:***@")}`);
  console.log(`CORS allowed origins: ${allowedOrigins.join(", ")}`);
  console.log(`Server URL: http://localhost:${port}`);
});
