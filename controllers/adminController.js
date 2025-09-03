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

      // Store admin in session
      req.session.adminId = admin.id;
      req.session.isAdmin = true;

      return res.json({
        success: true,
        admin: { id: admin.id, username: admin.username, role: admin.role },
        message: "Admin login successful",
      });
    } catch (err) {
      next(err);
    }
  }

  async getCurrentAdmin(req, res, next) {
    try {
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
        admin: { id: admin.id, username: admin.username, role: admin.role },
        message: "Admin retrieved successfully",
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req, res, next) {
    try {
      req.session.adminId = null;
      req.session.isAdmin = null;

      res.json({
        success: true,
        message: "Admin logged out successfully",
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();
