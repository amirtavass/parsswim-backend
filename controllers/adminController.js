const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const User = require("../models/user");

let controller = require("./controller");

class AdminController extends controller {
  async login(req, res, next) {
    try {
      console.log("🔐 Admin login attempt received");
      console.log("   Body:", { username: req.body.username, password: "***" });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("❌ Validation errors:", errors.array());
        return res.status(400).json({
          success: false,
          errors: errors.array().map((err) => err.msg),
        });
      }

      const { username, password } = req.body;

      // Find admin user from database
      console.log(`🔍 Looking for admin user: ${username}`);
      const admin = await User.findOne({ name: username, role: "admin" });
      console.log("   User found:", admin ? "YES" : "NO");

      if (!admin) {
        console.log(`❌ Admin user "${username}" not found in database`);
        return res.status(401).json({
          success: false,
          message: "Invalid admin credentials",
        });
      }

      // Check password
      const passwordMatch = bcrypt.compareSync(password, admin.password);
      console.log("   Password match:", passwordMatch ? "YES" : "NO");

      if (!passwordMatch) {
        console.log("❌ Password mismatch");
        return res.status(401).json({
          success: false,
          message: "Invalid admin credentials",
        });
      }

      // Issue JWT token
      console.log("✅ Admin credentials valid, issuing JWT");
      const { signAdmin } = require("../lib/jwt");
      const token = signAdmin({
        id: admin._id,
        username: admin.name,
        email: admin.email,
      });

      res.cookie("parsswim_admin_jwt", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 2 * 60 * 60 * 1000, // 2 hours
      });

      console.log("✅ Admin login successful");
      return res.json({
        success: true,
        admin: {
          id: admin._id,
          username: admin.name,
          email: admin.email,
          role: admin.role,
        },
        message: "Admin login successful",
      });
    } catch (err) {
      console.error("❌ Admin login error:", err.message);
      console.error("   Stack:", err.stack);
      res.status(500).json({
        success: false,
        message: "Admin login failed: " + err.message,
      });
    }
  }

  async getCurrentAdmin(req, res, next) {
    try {
      // Check JWT
      const { verifyAdmin } = require("../lib/jwt");
      const token =
        req.cookies.parsswim_admin_jwt ||
        (req.headers.authorization &&
          req.headers.authorization.replace("Bearer ", ""));
      if (!token) {
        return res
          .status(401)
          .json({ success: false, message: "Not authenticated as admin" });
      }
      try {
        const decoded = verifyAdmin(token);
        const admin = await User.findById(decoded.id);
        if (!admin || admin.role !== "admin") {
          return res
            .status(401)
            .json({ success: false, message: "Admin not found" });
        }
        res.json({
          success: true,
          admin: {
            id: admin._id,
            username: admin.name,
            email: admin.email,
            role: admin.role,
          },
          message: "Admin retrieved successfully",
        });
      } catch (err) {
        return res
          .status(401)
          .json({ success: false, message: "Invalid or expired token" });
      }
    } catch (err) {
      next(err);
    }
  }

  // async logout(req, res, next) {
  //   try {
  //     req.session.adminId = null;
  //     req.session.isAdmin = null;

  //     res.json({
  //       success: true,
  //       message: "Admin logged out successfully",
  //     });
  //   } catch (err) {
  //     next(err);
  //   }
  // }
  async logout(req, res, next) {
    try {
      res.clearCookie("parsswim_admin_jwt", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      });
      res.json({
        success: true,
        message: "Admin logged out successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
