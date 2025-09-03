const { validationResult } = require("express-validator");
let controller = require("./controller");
const passport = require("passport");

class AuthController extends controller {
  async getCurrentUser(req, res, next) {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({
          success: false,
          message: "Not authenticated",
        });
      }

      res.json({
        success: true,
        user: req.user,
        message: "User retrieved successfully",
      });
    } catch (err) {
      next(err);
    }
  }
  async logout(req, res, next) {
    try {
      req.logout((err) => {
        if (err) {
          return next(err);
        }
        res.json({
          success: true,
          message: "Logged out successfully",
        });
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map((err) => err.msg),
        });
      }

      passport.authenticate("local.login", (err, user, info) => {
        if (err) {
          console.error("Login error:", err);
          return res.status(500).json({
            success: false,
            message: "Server error during authentication",
          });
        }
        if (!user) {
          return res.status(401).json({
            success: false,
            message: "Invalid credentials",
          });
        }
        req.logIn(user, (err) => {
          if (err) {
            console.error("Session error:", err);
            return res.status(500).json({
              success: false,
              message: "Login failed",
            });
          }
          // Return user data without sensitive information
          const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            balance: user.balance,
            swimmingType: user.swimmingType,
            skillLevel: user.skillLevel,
            role: user.role,
          };
          return res.json({
            success: true,
            user: userResponse,
            message: "Login successful",
          });
        });
      })(req, res, next);
    } catch (err) {
      console.error("Unexpected error in login:", err);
      next(err);
    }
  }

  async register(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map((err) => err.msg),
        });
      }

      passport.authenticate("local.register", (err, user, info) => {
        if (err) {
          console.error("Registration error:", err);
          return res.status(500).json({
            success: false,
            message: "Registration failed: " + err.message,
          });
        }
        if (!user) {
          return res.status(400).json({
            success: false,
            message: info?.message || "User already exists",
          });
        }
        req.logIn(user, (err) => {
          if (err) {
            console.error("Session error after registration:", err);
            return res.status(500).json({
              success: false,
              message: "Registration successful but login failed",
            });
          }
          // Return user data without sensitive information
          const userResponse = {
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            balance: user.balance,
            swimmingType: user.swimmingType,
            skillLevel: user.skillLevel,
            role: user.role,
          };
          return res.json({
            success: true,
            user: userResponse,
            message: "Registration successful",
          });
        });
      })(req, res, next);
    } catch (err) {
      console.error("Unexpected error in registration:", err);
      next(err);
    }
  }

  // Add a logout method
  async logout(req, res, next) {
    try {
      req.logout((err) => {
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
    } catch (err) {
      next(err);
    }
  }

  // Add a method to check authentication status
  async checkAuth(req, res, next) {
    try {
      if (req.isAuthenticated()) {
        const userResponse = {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
          balance: req.user.balance,
          swimmingType: req.user.swimmingType,
          skillLevel: req.user.skillLevel,
          role: req.user.role,
        };
        return res.json({
          success: true,
          authenticated: true,
          user: userResponse,
        });
      } else {
        return res.json({
          success: true,
          authenticated: false,
        });
      }
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
