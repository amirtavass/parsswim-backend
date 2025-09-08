// server.js - Railway deployment with existing structure
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const passport = require("passport");
const flash = require("connect-flash");
const cookieParser = require("cookie-parser");
const path = require("path");

// Load environment variables
require("dotenv").config();

console.log("🚀 Starting ParsSwim API Server...");

const app = express();
const port = process.env.PORT || 4000;

// ✅ Configuration object (inline since config.js might not be available)
const config = {
  port: port,
  mongodb: {
    url: process.env.MONGODB_URL || "mongodb://localhost:27017/nodestart",
  },
  session: {
    secret: process.env.SESSION_SECRET || "gfvfdxzcb",
    cookie_secret: process.env.COOKIE_SECRET || "fdxnsfcbbdxc",
  },
};

// ✅ CORS Configuration
const corsOptions = {
  origin: [
    "https://parsswim.ir",
    "http://localhost:3000",
    "https://localhost:3000",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(config.session.cookie_secret));

// ✅ Session Configuration
app.use(
  session({
    secret: config.session.secret,
    resave: false,
    saveUninitialized: false,
    store: config.mongodb.url
      ? MongoStore.create({
          mongoUrl: config.mongodb.url,
        })
      : undefined,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);

// ✅ Passport Configuration
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// ✅ Health Check Route
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ParsSwim API is running on Railway!",
    timestamp: new Date().toISOString(),
    port: port,
    environment: process.env.NODE_ENV || "development",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ✅ Connect to Database
async function connectDatabase() {
  try {
    if (!config.mongodb.url) {
      console.log("⚠️  No MONGODB_URL provided - running without database");
      return;
    }

    await mongoose.connect(config.mongodb.url, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB connected successfully");

    // Initialize passport strategies after DB connection
    try {
      require("./passport/passportLocal");
      console.log("✅ Passport strategies loaded");
    } catch (error) {
      console.log("⚠️  Passport strategies not found, using inline auth");
    }

    // Add sample data if needed
    await addSampleData();
  } catch (error) {
    console.log("❌ MongoDB connection failed:", error.message);
    console.log("⚠️  Running without database - limited functionality");
  }
}

async function addSampleData() {
  try {
    // Try to import models
    let Class, Product;
    try {
      Class = require("./models/class");
      Product = require("./models/product");
    } catch (error) {
      console.log("⚠️  Model files not found, using inline models");

      // Define models inline if files don't exist
      const classSchema = new mongoose.Schema(
        {
          title: { type: String, required: true },
          classType: { type: String, required: true },
          description: { type: String },
          duration: { type: Number, required: true },
          date: { type: Date, required: true },
          time: { type: String, required: true },
          maxStudents: { type: Number, required: true },
          currentStudents: { type: Number, default: 0 },
          price: { type: Number, required: true },
          instructor: { type: String, required: true },
          location: { type: String, default: "استخر اصلی" },
          isActive: { type: Boolean, default: true },
        },
        { timestamps: true }
      );

      const productSchema = new mongoose.Schema(
        {
          name: { type: String, required: true },
          price: { type: Number, required: true },
          category: { type: String, required: true },
          description: { type: String },
          image: { type: String },
          inStock: { type: Boolean, default: true },
          isActive: { type: Boolean, default: true },
        },
        { timestamps: true }
      );

      Class = mongoose.model("Class", classSchema);
      Product = mongoose.model("Product", productSchema);
    }

    const classCount = await Class.countDocuments();
    const productCount = await Product.countDocuments();

    if (classCount === 0) {
      const sampleClasses = [
        {
          title: "کلاس شنای مبتدی",
          classType: "جلسه آزمایشی رایگان",
          description: "کلاس رایگان برای تازه واردان",
          duration: 60,
          date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          time: "10:00",
          maxStudents: 8,
          price: 0,
          instructor: "مربی اول",
        },
        {
          title: "کلاس خصوصی حرفه‌ای",
          classType: "کلاس خصوصی ۱۲ جلسه",
          description: "آموزش تخصصی و شخصی‌سازی شده",
          duration: 90,
          date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          time: "14:00",
          maxStudents: 1,
          price: 850000,
          instructor: "مربی اول",
        },
      ];
      await Class.insertMany(sampleClasses);
      console.log("✅ Sample classes added");
    }

    if (productCount === 0) {
      const sampleProducts = [
        {
          name: "مایو حرفه‌ای نایک",
          price: 450000,
          category: "swimwear",
          description: "مایو ورزشی با کیفیت بالا",
          image: "/images/swimwear/swimwear-1.jpg",
          inStock: true,
        },
        {
          name: "عینک شنا اسپیدو",
          price: 180000,
          category: "swimgoggles",
          description: "عینک شنا ضد مه",
          image: "/images/swimgoggles/goggles-1.jpg",
          inStock: true,
        },
      ];
      await Product.insertMany(sampleProducts);
      console.log("✅ Sample products added");
    }
  } catch (error) {
    console.log("⚠️  Error adding sample data:", error.message);
  }
}

// ✅ Try to import existing routes, fallback to inline routes
try {
  app.use("/", require("./routes/index"));
  console.log("✅ Using existing route structure");
} catch (error) {
  console.log("⚠️  Route files not found, using inline routes");

  // Import inline routes as fallback
  require("./inline-routes")(app, mongoose);
}

// ✅ Start Server
const server = app.listen(port, "0.0.0.0", async () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`✅ Environment: ${process.env.NODE_ENV || "development"}`);

  // Connect to database after server starts
  await connectDatabase();
});

// ✅ Graceful Shutdown
const gracefulShutdown = () => {
  console.log("Shutting down gracefully...");
  server.close(() => {
    console.log("Server closed");
    mongoose.connection.close(false, () => {
      console.log("MongoDB connection closed");
      process.exit(0);
    });
  });
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

module.exports = app;
