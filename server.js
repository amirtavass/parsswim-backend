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

// ✅ Database Models
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    age: { type: Number },
    balance: { type: Number, default: 0 },
    swimmingType: { type: String, default: "normal" },
    skillLevel: { type: String, default: "beginner" },
    role: { type: String, default: "student" },
  },
  { timestamps: true }
);

const classSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    classType: {
      type: String,
      enum: [
        "کلاس خصوصی ۱۲ جلسه",
        "کلاس پدر و فرزند",
        "کلاس آمادگی مسابقات",
        "سانس آزاد استخر",
        "جلسه آزمایشی رایگان",
      ],
      required: true,
    },
    description: { type: String },
    duration: { type: Number, required: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    maxStudents: { type: Number, required: true },
    currentStudents: { type: Number, default: 0 },
    price: { type: Number, required: true },
    instructor: {
      type: String,
      enum: ["مربی اول", "مربی دوم", "هر دو مربی"],
      required: true,
    },
    location: { type: String, default: "استخر اصلی" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: {
      type: String,
      enum: ["swimwear", "swimgoggles", "swimfins", "swimequipment"],
      required: true,
    },
    description: { type: String },
    image: { type: String },
    inStock: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Models
let User, Class, Product;

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

const upload = multer({ storage: storage });

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

// ✅ Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  if (
    req.method === "DELETE" ||
    req.method === "POST" ||
    req.method === "PUT"
  ) {
    console.log("Request details:", {
      path: req.path,
      method: req.method,
      session: {
        isAdmin: req.session?.isAdmin,
        adminId: req.session?.adminId,
        userId: req.session?.userId,
      },
      headers: {
        "content-type": req.headers["content-type"],
        cookie: req.headers.cookie ? "present" : "missing",
      },
    });
  }
  next();
});

// Serve static files
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// ✅ Session Configuration - FIXED for Railway
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: process.env.MONGODB_URL
      ? MongoStore.create({
          mongoUrl: process.env.MONGODB_URL,
        })
      : undefined,
    cookie: {
      secure: false, // CHANGED: Set to false for Railway
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "lax", // ADDED: Better cross-origin support
    },
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

// ✅ Helper Functions
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  console.log("Admin middleware check:", {
    sessionId: req.sessionID,
    isAdmin: req.session?.isAdmin,
    adminId: req.session?.adminId,
    sessionKeys: Object.keys(req.session || {}),
    cookies: req.headers.cookie ? "present" : "missing",
  });

  if (!req.session.isAdmin || !req.session.adminId) {
    console.log("Admin access denied - session check failed");
    return res.status(403).json({
      success: false,
      message: "Admin access required",
      debug: {
        isAdmin: req.session?.isAdmin,
        adminId: req.session?.adminId,
        sessionExists: !!req.session,
      },
    });
  }

  console.log("Admin access granted");
  next();
};

// ✅ Validation middleware
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

app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// ✅ Auth Routes
app.post("/auth/register", validateRegister, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array().map((err) => err.msg),
      });
    }

    if (!User) {
      return res.status(500).json({
        success: false,
        message: "Database not connected",
      });
    }

    const { name, email, phone, password, age } = req.body;

    // Check existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { name }],
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    // Create user
    const hashedPassword = bcrypt.hashSync(password, 8);
    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
      age: age || null,
      balance: 0,
    });

    await newUser.save();

    // Set session
    req.session.userId = newUser._id;
    req.session.user = {
      id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      balance: newUser.balance,
    };

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

    if (!User) {
      return res.status(500).json({
        success: false,
        message: "Database not connected",
      });
    }

    const { name, password } = req.body;

    // Find user
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
    req.session.userId = user._id;
    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      balance: user.balance,
    };

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
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
});

app.get("/auth/me", async (req, res) => {
  try {
    if (!req.session.userId || !User) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated",
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
    res.status(500).json({
      success: false,
      message: "Error fetching user",
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
  (req, res) => {
    try {
      console.log("Admin login attempt:", {
        username: req.body.username,
        sessionBefore: {
          isAdmin: req.session?.isAdmin,
          adminId: req.session?.adminId,
        },
      });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map((err) => err.msg),
        });
      }

      const { username, password } = req.body;
      const admin = ADMIN_USERS.find((a) => a.username === username);

      if (!admin || !bcrypt.compareSync(password, admin.password)) {
        console.log("Admin login failed - invalid credentials");
        return res.status(401).json({
          success: false,
          message: "Invalid admin credentials",
        });
      }

      // Set admin session
      req.session.adminId = admin.id;
      req.session.isAdmin = true;

      console.log("Admin login successful:", {
        adminId: admin.id,
        sessionAfter: {
          isAdmin: req.session.isAdmin,
          adminId: req.session.adminId,
          sessionId: req.sessionID,
        },
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
    } catch (error) {
      console.error("Admin login error:", error);
      res.status(500).json({
        success: false,
        message: "Admin login failed",
      });
    }
  }
);

app.get("/admin/me", (req, res) => {
  console.log("Admin /me check:", {
    sessionId: req.sessionID,
    isAdmin: req.session?.isAdmin,
    adminId: req.session?.adminId,
    sessionKeys: Object.keys(req.session || {}),
  });

  if (!req.session.isAdmin || !req.session.adminId) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated as admin",
      debug: {
        isAdmin: req.session?.isAdmin,
        adminId: req.session?.adminId,
        sessionExists: !!req.session,
      },
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
  req.session.adminId = null;
  req.session.isAdmin = null;
  res.json({
    success: true,
    message: "Admin logged out successfully",
  });
});

// ✅ Test route for debugging admin access
app.get("/test/admin", requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: "Admin access working",
    session: {
      isAdmin: req.session.isAdmin,
      adminId: req.session.adminId,
    },
  });
});

// ✅ Classes Routes
app.get("/classes", async (req, res) => {
  try {
    if (!Class) {
      return res.json({
        success: true,
        data: [],
        message: "Database not connected - sample data",
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
    console.error("Classes error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching classes",
    });
  }
});

app.get("/classes/available", async (req, res) => {
  try {
    if (!Class) {
      return res.json({
        success: true,
        data: [],
        message: "Database not connected",
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
      message: "Available classes retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching available classes",
    });
  }
});

app.get("/classes/:id", async (req, res) => {
  try {
    if (!Class) {
      return res.status(404).json({
        success: false,
        message: "Database not connected",
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
      message: "Class retrieved successfully",
    });
  } catch (error) {
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
        message: "Database not connected",
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
        message: "Database not connected",
      });
    }

    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
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
    res.status(500).json({
      success: false,
      message: "Error updating class",
    });
  }
});

app.delete("/classes/:id", requireAdmin, async (req, res) => {
  try {
    console.log("DELETE /classes/:id called with ID:", req.params.id);

    if (!Class) {
      console.log("Class model not available");
      return res.status(500).json({
        success: false,
        message: "Database not connected",
      });
    }

    console.log("Attempting to delete class with ID:", req.params.id);
    const deletedClass = await Class.findByIdAndDelete(req.params.id);

    if (!deletedClass) {
      console.log("Class not found for ID:", req.params.id);
      return res.status(404).json({
        success: false,
        message: "Class not found",
      });
    }

    console.log("Class deleted successfully:", deletedClass._id);
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

// ✅ Products Routes
app.get("/products", async (req, res) => {
  try {
    if (!Product) {
      return res.json({
        success: true,
        data: [],
        message: "Database not connected - sample data",
      });
    }

    let filter = { isActive: true };
    if (req.query.category) {
      filter.category = req.query.category;
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });
    res.json({
      success: true,
      data: products,
      message: "Products retrieved successfully",
    });
  } catch (error) {
    console.error("Products error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching products",
    });
  }
});

app.get("/products/:id", async (req, res) => {
  try {
    if (!Product) {
      return res.status(404).json({
        success: false,
        message: "Database not connected",
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
      message: "Product retrieved successfully",
    });
  } catch (error) {
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
        message: "Database not connected",
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
        message: "Database not connected",
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
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
    res.status(500).json({
      success: false,
      message: "Error updating product",
    });
  }
});

app.delete("/products/:id", requireAdmin, async (req, res) => {
  try {
    console.log("DELETE /products/:id called with ID:", req.params.id);

    if (!Product) {
      console.log("Product model not available");
      return res.status(500).json({
        success: false,
        message: "Database not connected",
      });
    }

    console.log("Attempting to delete product with ID:", req.params.id);
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);

    if (!deletedProduct) {
      console.log("Product not found for ID:", req.params.id);
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    console.log("Product deleted successfully:", deletedProduct._id);
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

// ✅ Upload Routes
app.post("/upload/product", requireAdmin, (req, res) => {
  console.log("Upload attempt - Admin check passed");

  const uploadSingle = upload.single("image");

  uploadSingle(req, res, (err) => {
    if (err) {
      console.error("Multer error:", err);
      return res.status(400).json({
        success: false,
        message: "File upload error: " + err.message,
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

      // Return proper image path - FIXED: Better path handling
      let imagePath = req.file.path.replace(/\\/g, "/");

      // Remove 'public' from the beginning if it exists
      if (imagePath.startsWith("public/")) {
        imagePath = imagePath.substring(6);
      }

      // Ensure path starts with single slash
      if (!imagePath.startsWith("/")) {
        imagePath = "/" + imagePath;
      }

      console.log("Final image path:", imagePath);

      // FIXED: Ensure we always return valid JSON with explicit headers
      res.setHeader("Content-Type", "application/json");
      const response = {
        success: true,
        imagePath: imagePath,
        message: "Image uploaded successfully",
        file: {
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
      };

      res.status(200).json(response);
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
    const mongoUrl = process.env.MONGODB_URL;

    if (!mongoUrl) {
      console.log("⚠️  No MONGODB_URL provided - running without database");
      return;
    }

    await mongoose.connect(mongoUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ MongoDB connected successfully");

    // Initialize models after connection
    User = mongoose.model("User", userSchema);
    Class = mongoose.model("Class", classSchema);
    Product = mongoose.model("Product", productSchema);

    // Add sample data if needed
    await addSampleData();
  } catch (error) {
    console.log("❌ MongoDB connection failed:", error.message);
    console.log("⚠️  Running without database - limited functionality");
  }
}

async function addSampleData() {
  try {
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
        {
          title: "کلاس پدر و فرزند",
          classType: "کلاس پدر و فرزند",
          description: "تجربه شنا با خانواده",
          duration: 75,
          date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          time: "16:30",
          maxStudents: 6,
          price: 450000,
          instructor: "هر دو مربی",
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
        {
          name: "فین شنا آرنا",
          price: 320000,
          category: "swimfins",
          description: "فین انعطاف‌پذیر برای تقویت عضلات پا",
          image: "/images/swimfin/fin-1.jpg",
          inStock: true,
        },
        {
          name: "کیف شنا ورزشی",
          price: 125000,
          category: "swimequipment",
          description: "کیف مقاوم در برابر آب با جیب‌های متعدد",
          image: "/images/equipment/backpack-1.jpg",
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

// ✅ 404 Handler
app.use("*", (req, res) => {
  console.log("404:", req.method, req.originalUrl);
  res.status(404).json({
    error: "Not Found",
    path: req.originalUrl,
    timestamp: new Date().toISOString(),
  });
});

// ✅ Error Handler
app.use((error, req, res, next) => {
  console.error("Error:", error.message);
  res.status(500).json({
    error: "Internal Server Error",
    message: error.message,
  });
});

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
