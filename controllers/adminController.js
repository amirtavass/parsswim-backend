const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");

// Simple in-memory admin for now (in production, use database)
const ADMIN_USERS = [
  {
    id: "admin1",
    username: "admin",
    password: bcrypt.hashSync("admin123", 8), // Hash the password
    role: "admin",
  },
];

let controller = require("./controller");

class AdminController extends controller {
  async login(req, res, next) {
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

      // Issue JWT token
      const { signAdmin } = require("../lib/jwt");
      const token = signAdmin(admin);
      res.cookie("parsswim_admin_jwt", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        maxAge: 2 * 60 * 60 * 1000, // 2 hours
      });
      return res.json({
        success: true,
        admin: { id: admin.id, username: admin.username, role: admin.role },
        token: token, // Include token for localStorage in production
        message: "Admin login successful",
      });
    } catch (err) {
      console.error("Admin login error:", err);
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
        const admin = ADMIN_USERS.find((a) => a.id === decoded.id);
        if (!admin) {
          return res
            .status(401)
            .json({ success: false, message: "Admin not found" });
        }
        res.json({
          success: true,
          admin: { id: admin.id, username: admin.username, role: admin.role },
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
