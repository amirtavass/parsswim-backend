const express = require("express");
const cors = require("cors");
const session = require("express-session");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const MongoStore = require("connect-mongo");
const { validationResult, check } = require("express-validator");
const multer = require("multer");
const path = require("path");
const { mkdirp } = require("mkdirp");

require("dotenv").config();

console.log("🚀 Starting ParsSwim API Server...");

const app = express();
const port = process.env.PORT || 4000;

// Models
const User = require("./models/user");
const Class = require("./models/class");
const Product = require("./models/product");

// ✅ Multer Configuration for File Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    mkdirp("./public/uploads/images").then((made) => {
      cb(null, "./public/uploads/images");
    });
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// ✅ CORS Configuration - FIXED
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "https://parsswim.ir",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ];

    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in production for now
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
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "lax",
      domain:
        process.env.NODE_ENV === "production" ? ".parsswim.ir" : undefined,
    },
    name: "parsswim.sid", // Custom session name
  })
);

// ✅ Admin credentials
const ADMIN_USERS = [
  {
    id: "admin1",
    username: "admin",
    password: bcrypt.hashSync("admin123", 8),
    role: "admin",
  },
];

// ✅ Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - Session ID: ${req.sessionID}`);
  if (req.session) {
    console.log("Session data:", {
      isAdmin: req.session.isAdmin,
      adminId: req.session.adminId,
      userId: req.session.userId,
    });
  }
  next();
});

// ✅ Helper Middleware Functions
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  console.log("Checking admin access:", {
    sessionId: req.sessionID,
    isAdmin: req.session?.isAdmin,
    adminId: req.session?.adminId,
  });

  if (!req.session || !req.session.isAdmin || !req.session.adminId) {
    return res.status(403).json({
      success: false,
      message: "Admin access required - Please login as admin",
    });
  }
  next();
};

// ✅ Validation Middleware
const validateLogin = [
  check("name", "Username is required").not().isEmpty(),
  check("password", "Password must be at least 5 characters").isLength({
    min: 5,
  }),
];

const validateRegister = [
  check("name", "Name is required").not().isEmpty(),
  check("email", "Valid email is required").isEmail(),
  check("phone", "Phone is required").not().isEmpty(),
  check("password", "Password must be at least 5 characters").isLength({
    min: 5,
  }),
];

const validateClass = [
  check("title", "Title is required").not().isEmpty(),
  check("classType", "Valid class type required").isIn([
    "کلاس خصوصی ۱۲ جلسه",
    "کلاس پدر و فرزند",
    "کلاس آمادگی مسابقات",
    "سانس آزاد استخر",
    "جلسه آزمایشی رایگان",
  ]),
  check("duration", "Duration must be positive").isInt({ min: 1 }),
  check("date", "Valid date required").isISO8601(),
  check("time", "Time is required").not().isEmpty(),
  check("maxStudents", "Max students must be positive").isInt({ min: 1 }),
  check("price", "Price must be non-negative").isNumeric({ min: 0 }),
  check("instructor", "Valid instructor required").isIn([
    "مربی اول",
    "مربی دوم",
    "هر دو مربی",
  ]),
];

const validateProduct = [
  check("name", "Product name is required").not().isEmpty(),
  check("price", "Price must be positive").isNumeric({ min: 0 }),
  check("category", "Valid category required").isIn([
    "swimwear",
    "swimgoggles",
    "swimfins",
    "swimequipment",
  ]),
];

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

// ✅ User Authentication Routes
app.post("/auth/register", validateRegister, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err) => err.msg),
      });
    }

    const { name, email, phone, password, age } = req.body;

    if (!User) {
      return res.status(500).json({
        success: false,
        message: "Database not initialized",
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { name }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email or username",
      });
    }

    // Create new user
    const hashedPassword = bcrypt.hashSync(password, 8);
    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      age: age || null,
      balance: 0,
      skillLevel: "beginner",
    });

    await newUser.save();

    // Set session
    req.session.userId = newUser._id.toString();
    req.session.user = {
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      balance: newUser.balance,
    };

    // Save session before sending response
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
      }

      res.json({
        success: true,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          balance: newUser.balance,
          skillLevel: newUser.skillLevel,
        },
        message: "Registration successful",
      });
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      message: "Registration failed: " + error.message,
    });
  }
});

app.post("/auth/login", validateLogin, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err) => err.msg),
      });
    }

    const { name, password } = req.body;

    if (!User) {
      return res.status(500).json({
        success: false,
        message: "Database not initialized",
      });
    }

    // Find user by name or email
    const user = await User.findOne({
      $or: [{ name }, { email: name }],
    });

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Set session
    req.session.userId = user._id.toString();
    req.session.user = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      balance: user.balance,
    };

    // Save session before sending response
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
      }

      res.json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          balance: user.balance,
          skillLevel: user.skillLevel,
        },
        message: "Login successful",
      });
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed: " + error.message,
    });
  }
});

app.get("/auth/me", async (req, res) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
      });
    }

    if (!User) {
      return res.status(500).json({
        success: false,
        message: "Database not initialized",
      });
    }

    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        balance: user.balance,
        skillLevel: user.skillLevel,
      },
    });
  } catch (error) {
    console.error("Auth check error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching user data",
    });
  }
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Logout failed",
      });
    }
    res.clearCookie("parsswim.sid");
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  });
});

// ✅ Admin Routes
app.post(
  "/admin/login",
  [
    check("username", "Username is required").not().isEmpty(),
    check("password", "Password is required").not().isEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map((err) => err.msg),
        });
      }

      const { username, password } = req.body;

      // Find admin user
      const admin = ADMIN_USERS.find((a) => a.username === username);

      if (!admin || !bcrypt.compareSync(password, admin.password)) {
        return res.status(401).json({
          success: false,
          message: "Invalid admin credentials",
        });
      }

      // Clear any existing user session
      if (req.session.userId) {
        delete req.session.userId;
        delete req.session.user;
      }

      // Set admin session
      req.session.adminId = admin.id;
      req.session.isAdmin = true;

      // Save session before sending response
      req.session.save((err) => {
        if (err) {
          console.error("Admin session save error:", err);
          return res.status(500).json({
            success: false,
            message: "Session save failed",
          });
        }

        console.log("Admin logged in successfully:", {
          adminId: admin.id,
          sessionId: req.sessionID,
        });

        res.json({
          success: true,
          admin: {
            id: admin.id,
            username: admin.username,
            role: admin.role,
          },
          message: "Admin login successful",
        });
      });
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({
        success: false,
        message: "Admin login failed: " + error.message,
      });
    }
  }
);

app.get("/admin/me", (req, res) => {
  if (!req.session || !req.session.isAdmin || !req.session.adminId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated as admin",
    });
  }

  const admin = ADMIN_USERS.find((a) => a.id === req.session.adminId);
  if (!admin) {
    return res.status(401).json({
      success: false,
      message: "Admin not found",
    });
  }

  res.json({
    success: true,
    admin: {
      id: admin.id,
      username: admin.username,
      role: admin.role,
    },
  });
});

app.post("/admin/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Logout failed",
      });
    }
    res.clearCookie("parsswim.sid");
    res.json({
      success: true,
      message: "Admin logged out successfully",
    });
  });
});

// ✅ Class Routes
app.get("/classes", async (req, res) => {
  try {
    if (!Class) {
      return res.status(500).json({
        success: false,
        message: "Database not initialized",
      });
    }

    let filter = { isActive: true };
    if (req.query.classType) {
      filter.classType = req.query.classType;
    }

    const classes = await Class.find(filter).sort({ date: 1, time: 1 });
    res.json({
      success: true,
      data: classes,
      message: "Classes retrieved successfully",
    });
  } catch (error) {
    console.error("Get classes error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching classes",
    });
  }
});

app.get("/classes/available", async (req, res) => {
  try {
    if (!Class) {
      return res.status(500).json({
        success: false,
        message: "Database not initialized",
      });
    }

    const classes = await Class.find({
      isActive: true,
      date: { $gte: new Date() },
      $expr: { $lt: ["$currentStudents", "$maxStudents"] },
    }).sort({ date: 1, time: 1 });

    res.json({
      success: true,
      data: classes,
    });
  } catch (error) {
    console.error("Get available classes error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching available classes",
    });
  }
});

app.get("/classes/:id", async (req, res) => {
  try {
    if (!Class) {
      return res.status(500).json({
        success: false,
        message: "Database not initialized",
      });
    }

    const classItem = await Class.findById(req.params.id);
    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    res.json({
      success: true,
      data: classItem,
    });
  } catch (error) {
    console.error("Get class error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching class",
    });
  }
});

app.post("/classes", requireAdmin, validateClass, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err) => err.msg),
      });
    }

    if (!Class) {
      return res.status(500).json({
        success: false,
        message: "Database not initialized",
      });
    }

    const newClass = new Class(req.body);
    await newClass.save();

    res.status(201).json({
      success: true,
      data: newClass,
      message: "Class created successfully",
    });
  } catch (error) {
    console.error("Create class error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating class: " + error.message,
    });
  }
});

app.put("/classes/:id", requireAdmin, validateClass, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err) => err.msg),
      });
    }

    if (!Class) {
      return res.status(500).json({
        success: false,
        message: "Database not initialized",
      });
    }

    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    res.json({
      success: true,
      data: updatedClass,
      message: "Class updated successfully",
    });
  } catch (error) {
    console.error("Update class error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating class: " + error.message,
    });
  }
});

app.delete("/classes/:id", requireAdmin, async (req, res) => {
  try {
    if (!Class) {
      return res.status(500).json({
        success: false,
        message: "Database not initialized",
      });
    }

    const deletedClass = await Class.findByIdAndDelete(req.params.id);
    if (!deletedClass) {
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    res.json({
      success: true,
      message: "Class deleted successfully",
    });
  } catch (error) {
    console.error("Delete class error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting class: " + error.message,
    });
  }
});

// ✅ Product Routes
app.get("/products", async (req, res) => {
  try {
    if (!Product) {
      return res.status(500).json({
        success: false,
        message: "Database not initialized",
      });
    }

    let filter = { isActive: true };
    if (req.query.category) {
      filter.category = req.query.category;
    }

    const products = await Product.find(filter);
    res.json({
      success: true,
      data: products,
      message: "Products retrieved successfully",
    });
  } catch (error) {
    console.error("Get products error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching products",
    });
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    if (!Product) {
      return res.status(500).json({
        success: false,
        message: "Database not initialized",
      });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error("Get product error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching product",
    });
  }
});

app.post("/products", requireAdmin, validateProduct, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err) => err.msg),
      });
    }

    if (!Product) {
      return res.status(500).json({
        success: false,
        message: "Database not initialized",
      });
    }

    const newProduct = new Product(req.body);
    await newProduct.save();

    res.status(201).json({
      success: true,
      data: newProduct,
      message: "Product created successfully",
    });
  } catch (error) {
    console.error("Create product error:", error);
    res.status(500).json({
      success: false,
      message: "Error creating product: " + error.message,
    });
  }
});

app.put("/products/:id", requireAdmin, validateProduct, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err) => err.msg),
      });
    }

    if (!Product) {
      return res.status(500).json({
        success: false,
        message: "Database not initialized",
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      data: updatedProduct,
      message: "Product updated successfully",
    });
  } catch (error) {
    console.error("Update product error:", error);
    res.status(500).json({
      success: false,
      message: "Error updating product: " + error.message,
    });
  }
});

app.delete("/products/:id", requireAdmin, async (req, res) => {
  try {
    if (!Product) {
      return res.status(500).json({
        success: false,
        message: "Database not initialized",
      });
    }

    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting product: " + error.message,
    });
  }
});

// ✅ Upload Route - FIXED
app.post("/upload/product", requireAdmin, (req, res) => {
  const uploadSingle = upload.single("image");

  uploadSingle(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({
        success: false,
        message: err.message || "File upload error",
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No image file provided",
        });
      }

      console.log("File uploaded successfully:", req.file);

      // Create proper image path
      let imagePath = req.file.path.replace(/\\/g, "/");

      // Remove 'public' from the beginning
      if (imagePath.startsWith("public/")) {
        imagePath = imagePath.substring(6);
      } else if (imagePath.startsWith("./public/")) {
        imagePath = imagePath.substring(8);
      }

      // Ensure path starts with single slash
      if (!imagePath.startsWith("/")) {
        imagePath = "/" + imagePath;
      }

      console.log("Returning image path:", imagePath);

      res.json({
        success: true,
        imagePath: imagePath,
        message: "Image uploaded successfully",
        file: {
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
      });
    } catch (error) {
      console.error("Upload processing error:", error);
      res.status(500).json({
        success: false,
        message: "Upload processing failed: " + error.message,
      });
    }
  });
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
