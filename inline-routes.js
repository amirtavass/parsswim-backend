// inline-routes.js - Fallback routes if existing structure isn't available
const bcrypt = require("bcrypt");
const { validationResult, check } = require("express-validator");

module.exports = (app, mongoose) => {
  console.log("📝 Loading inline routes as fallback");

  // Define models inline
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

  const User = mongoose.model("User", userSchema);
  const Class = mongoose.model("Class", classSchema);
  const Product = mongoose.model("Product", productSchema);

  // Admin credentials
  const ADMIN_USERS = [
    {
      id: "admin1",
      username: "admin",
      password: bcrypt.hashSync("admin123", 8),
      role: "admin",
    },
  ];

  // Middleware
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
    if (!req.session.isAdmin || !req.session.adminId) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }
    next();
  };

  // Validation
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

      const { name, email, phone, password, age } = req.body;

      const existingUser = await User.findOne({
        $or: [{ email }, { name }],
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

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

      const { name, password } = req.body;

      const user = await User.findOne({
        $or: [{ name }, { email: name }],
      });

      if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials",
        });
      }

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
      if (!req.session.userId) {
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
          return res.status(401).json({
            success: false,
            message: "Invalid admin credentials",
          });
        }

        req.session.adminId = admin.id;
        req.session.isAdmin = true;

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
        res.status(500).json({
          success: false,
          message: "Admin login failed",
        });
      }
    }
  );

  app.get("/admin/me", (req, res) => {
    if (!req.session.isAdmin || !req.session.adminId) {
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
    req.session.adminId = null;
    req.session.isAdmin = null;
    res.json({
      success: true,
      message: "Admin logged out successfully",
    });
  });

  // ✅ Classes Routes
  app.get("/classes", async (req, res) => {
    try {
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

  app.post(
    "/classes",
    requireAdmin,
    [
      check("title", "Title is required").not().isEmpty(),
      check("duration", "Duration must be positive").isInt({ min: 1 }),
      check("date", "Valid date required").isISO8601(),
      check("maxStudents", "Max students must be positive").isInt({ min: 1 }),
      check("price", "Price must be non-negative").isNumeric({ min: 0 }),
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

        const newClass = new Class(req.body);
        await newClass.save();

        res.status(201).json({
          success: true,
          data: newClass,
          message: "Class created successfully",
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Error creating class",
        });
      }
    }
  );

  app.put(
    "/classes/:id",
    requireAdmin,
    [
      check("title", "Title is required").not().isEmpty(),
      check("duration", "Duration must be positive").isInt({ min: 1 }),
      check("date", "Valid date required").isISO8601(),
      check("maxStudents", "Max students must be positive").isInt({ min: 1 }),
      check("price", "Price must be non-negative").isNumeric({ min: 0 }),
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
    }
  );

  app.delete("/classes/:id", requireAdmin, async (req, res) => {
    try {
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
      res.status(500).json({
        success: false,
        message: "Error deleting class",
      });
    }
  });

  // ✅ Products Routes
  app.get("/products", async (req, res) => {
    try {
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

  app.post(
    "/products",
    requireAdmin,
    [
      check("name", "Product name is required").not().isEmpty(),
      check("price", "Price must be positive").isNumeric({ min: 0 }),
      check("category", "Valid category required").isIn([
        "swimwear",
        "swimgoggles",
        "swimfins",
        "swimequipment",
      ]),
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

        const newProduct = new Product(req.body);
        await newProduct.save();

        res.status(201).json({
          success: true,
          data: newProduct,
          message: "Product created successfully",
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: "Error creating product",
        });
      }
    }
  );

  app.put(
    "/products/:id",
    requireAdmin,
    [
      check("name", "Product name is required").not().isEmpty(),
      check("price", "Price must be positive").isNumeric({ min: 0 }),
      check("category", "Valid category required").isIn([
        "swimwear",
        "swimgoggles",
        "swimfins",
        "swimequipment",
      ]),
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
    }
  );

  app.delete("/products/:id", requireAdmin, async (req, res) => {
    try {
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
      res.status(500).json({
        success: false,
        message: "Error deleting product",
      });
    }
  });

  // ✅ Upload Routes
  const multer = require("multer");
  const storage = multer.memoryStorage();
  const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif/;
      const extname = allowedTypes.test(file.originalname.toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error("Only image files are allowed"));
      }
    },
  });

  app.post(
    "/upload/product",
    requireAdmin,
    upload.single("image"),
    (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({
            success: false,
            message: "No image file provided",
          });
        }

        const imagePath = `/uploads/images/${Date.now()}-${
          req.file.originalname
        }`;

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
        console.error("Upload error:", error);
        res.status(500).json({
          success: false,
          message: "Upload failed: " + error.message,
        });
      }
    }
  );

  // 404 handler
  app.use("*", (req, res) => {
    res.status(404).json({
      error: "Not Found",
      path: req.originalUrl,
      timestamp: new Date().toISOString(),
    });
  });

  console.log("✅ Inline routes loaded successfully");
};
