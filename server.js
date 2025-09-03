const express = require("express");
const cors = require("cors");
const path = require("path");
const config = require("./config");
const passport = require("passport");
//order is important:cookieParser and session before flash
const methodOverride = require("method-override");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const flash = require("connect-flash");

require("dotenv").config();
require("app-module-path").addPath(__dirname);

const app = express();
//mongoose and mongostore
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
// Railway provides MONGODB_URL, fallback to local for development
const mongoUrl =
  process.env.MONGODB_URL || "mongodb://localhost:27017/nodestart";
mongoose.connect(mongoUrl);

global.config = require("./config");

app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// IMPORTANT: Serve static files (including uploaded images)
app.use(express.static(path.join(__dirname, "public")));

// Additional static route specifically for uploads (in case of issues)
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(methodOverride("method"));
//again order is important
// Session configuration
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: {
      expires: new Date(Date.now() + 1000 * 3600 * 24 * 100),
      secure: process.env.NODE_ENV === "production", // HTTPS in production
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // Cross-site cookies
    },
    store: MongoStore.create({
      mongoUrl: mongoUrl,
      touchAfter: 24 * 3600, // lazy session update
    }),
  })
);
app.use(flash());

// Passport configuration

require("./passport/passportLocal");
app.use(passport.initialize());
app.use(passport.session());

app.set("view engine", "ejs");

//middleware1
app.use((req, res, next) => {
  next();
});
app.use((req, res, next) => {
  res.locals = { errors: req.flash("errors"), req: req };
  next();
});

// Health check endpoint for Railway
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ParsSwim API is running!",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.render("index");
});

// app.use("/user", require("./routes/user"));
//route created in routes folder and not here

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

  // In production, don't expose stack traces
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

// Use Railway's PORT or fallback
const port = process.env.PORT || 4000;

app.listen(port, "0.0.0.0", () => {
  console.log(`🚀 ParsSwim API server is running on port ${port}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Database: ${mongoUrl}`);
});
