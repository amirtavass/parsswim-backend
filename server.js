const express = require("express");
const cors = require("cors");
const session = require("express-session");
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const path = require("path");
const { mkdirp } = require("mkdirp");

require("dotenv").config();

console.log("🚀 Starting ParsSwim API Server...");

const app = express();
const port = process.env.PORT || 4000;

const cookieParser = require("cookie-parser");
app.use(cookieParser());

// // ✅ Multer Configuration for File Uploads
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     mkdirp("./public/uploads/images").then((made) => {
//       cb(null, "./public/uploads/images");
//     });
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + "-" + file.originalname);
//   },
// });

// const upload = multer({
//   storage: storage,
//   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
//   fileFilter: (req, file, cb) => {
//     const allowedTypes = /jpeg|jpg|png|gif/;
//     const extname = allowedTypes.test(
//       path.extname(file.originalname).toLowerCase()
//     );
//     const mimetype = allowedTypes.test(file.mimetype);

//     if (mimetype && extname) {
//       return cb(null, true);
//     } else {
//       cb(new Error("Only image files are allowed"));
//     }
//   },
// });

// ✅ CORS Configuration - FIXED FOR PRODUCTION
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://parsswim.ir",
      "https://www.parsswim.ir",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ];

    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log("CORS blocked origin:", origin);
      callback(new Error("Not allowed by CORS"), false);
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie", "Set-Cookie"],
  exposedHeaders: ["Set-Cookie"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// ✅ Body Parser Middleware - MUST BE BEFORE SESSION
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Static files
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));
app.use(express.static("public"));

// ✅ Session Configuration - FIXED
app.set("trust proxy", 1); // Trust first proxy for Railway

const isProduction = process.env.NODE_ENV === "production";

app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: process.env.MONGODB_URL
      ? MongoStore.create({
          mongoUrl: process.env.MONGODB_URL,
          touchAfter: 24 * 3600, // lazy session update
        })
      : undefined,
    cookie: {
      secure: isProduction,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: isProduction ? "none" : "lax",
      // domain removed so cookie is scoped to the backend host (Railway domain) and not rejected by browser
    },
    name: "parsswim.sid", // Custom session name
  }),
);

// ✅ Passport Configuration
const passport = require("passport");
require("./passport/passportLocal"); // Load passport strategies
app.use(passport.initialize());
app.use(passport.session());

// ✅ Debug middleware was causing global issues with session handling, so it's removed for now. Use logging in specific routes instead.
// app.use((req, res, next) => {
//   console.log(`${req.method} ${req.path} - Session ID: ${req.sessionID}`);
//   if (req.session) {
//     console.log("Session data:", {
//       isAdmin: req.session.isAdmin,
//       adminId: req.session.adminId,
//       userId: req.session.userId,
//     });
//   }
//   next();
// });

// ✅ Health Check Routes
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ParsSwim API is running!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    database:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ✅ Auth AND Admin Routes (using Passport)
app.use("/auth", require("./routes/auth"));
app.use("/admin", require("./routes/admin"));
// ✅ API Routes
app.use("/classes", require("./routes/class"));
app.use("/products", require("./routes/product"));
app.use("/upload", require("./routes/upload"));
// // ✅ Upload Route - FIXED
// app.post("/upload/product", requireAdmin, (req, res) => {
//   const uploadSingle = upload.single("image");

//   uploadSingle(req, res, (err) => {
//     if (err) {
//       console.error("Multer error:", err);
//       return res.status(400).json({
//         success: false,
//         message: err.message || "File upload error",
//       });
//     }

//     try {
//       if (!req.file) {
//         return res.status(400).json({
//           success: false,
//           message: "No image file provided",
//         });
//       }

//       console.log("File uploaded successfully:", req.file);

//       // Create proper image path
//       let imagePath = req.file.path.replace(/\\/g, "/");

//       // Remove 'public' from the beginning
//       if (imagePath.startsWith("public/")) {
//         imagePath = imagePath.substring(6);
//       } else if (imagePath.startsWith("./public/")) {
//         imagePath = imagePath.substring(8);
//       }

//       // Ensure path starts with single slash
//       if (!imagePath.startsWith("/")) {
//         imagePath = "/" + imagePath;
//       }

//       console.log("Returning image path:", imagePath);

//       res.json({
//         success: true,
//         imagePath: imagePath,
//         message: "Image uploaded successfully",
//         file: {
//           originalName: req.file.originalname,
//           size: req.file.size,
//           mimetype: req.file.mimetype,
//         },
//       });
//     } catch (error) {
//       console.error("Upload processing error:", error);
//       res.status(500).json({
//         success: false,
//         message: "Upload processing failed: " + error.message,
//       });
//     }
//   });
// });

// ✅ Payment Routes
app.use("/payment", require("./routes/payment"));

// ✅ Balance Charge Route (Fixed)
app.post("/dashboard/pay", async (req, res) => {
  try {
    // Parse amount from form data
    const amount = parseInt(req.body.amount);

    if (!req.session.userId && !req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Get user ID from session or passport
    const userId = req.session.userId || (req.user && req.user._id);

    const axios = require("axios");
    const params = {
      merchant_id: "12345678-1234-1234-1234-123456789012",
      amount: amount,
      callback_url: isProduction
        ? "https://parsswim-backend-production.up.railway.app/dashboard/paycallback"
        : "http://localhost:4000/dashboard/paycallback",
      description: "Charge account balance - sandbox test",
    };

    const response = await axios.post(
      "https://sandbox.zarinpal.com/pg/v4/payment/request.json",
      params,
    );

    if (response.data.data && response.data.data.code === 100) {
      const Payment = require("./models/payment");
      const newPayment = new Payment({
        user: userId,
        amount: amount,
        resnumber: response.data.data.authority,
      });
      await newPayment.save();

      return res.redirect(
        `https://sandbox.zarinpal.com/pg/StartPay/${response.data.data.authority}`,
      );
    } else {
      return res.status(400).json({
        success: false,
        message: "Payment initiation failed",
      });
    }
  } catch (error) {
    console.error("Dashboard payment error:", error);
    res.status(500).json({
      success: false,
      message: "Payment error: " + error.message,
    });
  }
});

// ✅ Dashboard Payment Callback
app.get("/dashboard/paycallback", async (req, res) => {
  try {
    const axios = require("axios");
    const Payment = require("./models/payment");
    const User = require("./models/user");

    if (req.query.Status && req.query.Status !== "OK") {
      const frontendUrl = isProduction
        ? "https://parsswim.ir"
        : "http://localhost:3000";
      return res.redirect(`${frontendUrl}/dashboard?payment=cancelled`);
    }

    let paymentRecord = await Payment.findOne({
      resnumber: req.query.Authority,
    });

    if (!paymentRecord) {
      const frontendUrl = isProduction
        ? "https://parsswim.ir"
        : "http://localhost:3000";
      return res.redirect(`${frontendUrl}/dashboard?payment=notfound`);
    }

    let params = {
      merchant_id: "12345678-1234-1234-1234-123456789012",
      amount: paymentRecord.amount,
      authority: req.query.Authority,
    };

    const response = await axios.post(
      "https://sandbox.zarinpal.com/pg/v4/payment/verify.json",
      params,
    );

    if (
      response.data.data &&
      (response.data.data.code === 100 || response.data.data.code === 101)
    ) {
      paymentRecord.payment = true;
      await paymentRecord.save();

      // Update user balance
      await User.findByIdAndUpdate(paymentRecord.user, {
        $inc: { balance: paymentRecord.amount },
      });

      const frontendUrl = isProduction
        ? "https://parsswim.ir"
        : "http://localhost:3000";
      return res.redirect(`${frontendUrl}/dashboard?payment=success`);
    } else {
      const frontendUrl = isProduction
        ? "https://parsswim.ir"
        : "http://localhost:3000";
      return res.redirect(`${frontendUrl}/dashboard?payment=failed`);
    }
  } catch (err) {
    console.error("Dashboard payment callback error:", err);
    const frontendUrl = isProduction
      ? "https://parsswim.ir"
      : "http://localhost:3000";
    res.redirect(`${frontendUrl}/dashboard?payment=error`);
  }
});
// ✅ Payment Callback Route (for cart payments)
app.get("/paycallback", async (req, res) => {
  try {
    const axios = require("axios");
    const Payment = require("./models/payment");

    // If payment was cancelled
    if (req.query.Status && req.query.Status !== "OK") {
      const frontendUrl = isProduction
        ? "https://parsswim.ir"
        : "http://localhost:3000";
      return res.redirect(`${frontendUrl}/cart?payment=cancelled`);
    }

    let paymentRecord = await Payment.findOne({
      resnumber: req.query.Authority,
    });

    if (!paymentRecord) {
      const frontendUrl = isProduction
        ? "https://parsswim.ir"
        : "http://localhost:3000";
      return res.redirect(`${frontendUrl}/cart?payment=notfound`);
    }

    let params = {
      merchant_id: "12345678-1234-1234-1234-123456789012",
      amount: paymentRecord.amount,
      authority: req.query.Authority,
    };

    const response = await axios.post(
      "https://sandbox.zarinpal.com/pg/v4/payment/verify.json",
      params,
    );

    if (
      response.data.data &&
      (response.data.data.code === 100 || response.data.data.code === 101)
    ) {
      paymentRecord.payment = true;
      await paymentRecord.save();

      const frontendUrl = isProduction
        ? "https://parsswim.ir"
        : "http://localhost:3000";
      return res.redirect(`${frontendUrl}/cart?payment=success`);
    } else {
      const frontendUrl = isProduction
        ? "https://parsswim.ir"
        : "http://localhost:3000";
      return res.redirect(`${frontendUrl}/cart?payment=failed`);
    }
  } catch (err) {
    console.error("Payment callback error:", err);
    const frontendUrl = isProduction
      ? "https://parsswim.ir"
      : "http://localhost:3000";
    res.redirect(`${frontendUrl}/cart?payment=error`);
  }
});

// ✅ Database Connection
async function connectDatabase() {
  try {
    const mongoUrl =
      process.env.MONGODB_URL || "mongodb://localhost:27017/parsswim";

    console.log("🔄 Connecting to MongoDB...");
    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected successfully");

    console.log("✅ Models initialized");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    // Don't exit, allow server to run without database
  }
}

// ✅ Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

// ✅ 404 Handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

// ✅ Start Server
async function startServer() {
  await connectDatabase();

  app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);

    console.log(`🔗 API URL: http://localhost:${port}`);
  });
}

startServer();

module.exports = app;
