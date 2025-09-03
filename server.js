// Updated: [8:25pm]
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
console.log("Using MongoDB URL:", mongoUrl.replace(/\/\/.*@/, "//***:***@")); // Hide credentials

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

// CORS configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : ["http://localhost:3000", "https://parsswim.ir"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log("❌ CORS blocked origin:", origin);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// Body parsing
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(methodOverride("method"));

// Session configuration
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: {
      expires: new Date(Date.now() + 1000 * 3600 * 24 * 100),
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
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

// Middleware
app.use((req, res, next) => {
  next();
});

app.use((req, res, next) => {
  res.locals = { errors: req.flash("errors"), req: req };
  next();
});

// Health check endpoint
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ParsSwim API is running! 🏊‍♂️",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    database:
      mongoose.connection.readyState === 1 ? "Connected ✅" : "Disconnected ❌",
  });
});

// API routes
app.use("/", require("./routes/index"));

// Error handling
app.all(/.*/, (req, res, next) => {
  try {
    let err = new Error("API endpoint not found");
    err.status = 404;
    throw err;
  } catch (err) {
    next(err);
  }
});

app.use(async (err, req, res, next) => {
  const code = err.status || 500;
  const message = err.message;

  if (process.env.NODE_ENV === "production") {
    return res.status(code).json({
      success: false,
      message:
        code === 404 ? "API endpoint not found" : "Internal server error",
    });
  } else {
    return res.status(code).json({
      success: false,
      message: message,
      stack: err.stack,
    });
  }
});

// Use Railway's PORT
const port = process.env.PORT || 4000;

app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 ParsSwim API server is running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Database: ${mongoUrl.replace(/\/\/.*@/, "//***:***@")}`);
  console.log(`CORS allowed origins: ${allowedOrigins.join(", ")}`);
});

module.exports = app;
