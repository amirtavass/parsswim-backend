const { validationResult } = require("express-validator");
const Class = require("../models/class");
let controller = require("./controller");

class ClassController extends controller {
  // GET /api/classes - Get all classes (with optional filters)
  async getAllClasses(req, res, next) {
    try {
      let filter = { isActive: true };

      // Add filters based on query parameters
      if (req.query.classType) {
        filter.classType = req.query.classType;
      }
      if (req.query.skillLevel) {
        filter.skillLevel = req.query.skillLevel;
      }
      if (req.query.date) {
        // Filter by specific date
        const startDate = new Date(req.query.date);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        filter.date = { $gte: startDate, $lt: endDate };
      }

      const classes = await Class.find(filter).sort({ date: 1, time: 1 });

      res.json({
        success: true,
        data: classes,
        message: "Classes retrieved successfully",
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/classes/:id - Get single class
  async getOneClass(req, res, next) {
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
    } catch (err) {
      next(err);
    }
  }

  // POST /api/classes - Create new class (Admin only)
  async createClass(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map((err) => err.msg),
          message: "Validation failed",
        });
      }

      const newClass = new Class({
        title: req.body.title,
        classType: req.body.classType,
        description: req.body.description,
        duration: req.body.duration,
        skillLevel: req.body.skillLevel,
        date: req.body.date,
        time: req.body.time,
        maxStudents: req.body.maxStudents,
        price: req.body.price,
        requiresRegistration: req.body.requiresRegistration,
        instructor: req.body.instructor,
        location: req.body.location,
        notes: req.body.notes,
        equipment: req.body.equipment || [],
      });

      await newClass.save();

      res.status(201).json({
        success: true,
        data: newClass,
        message: "Class created successfully",
      });
    } catch (err) {
      next(err);
    }
  }

  // PUT /api/classes/:id - Update class (Admin only)
  async updateClass(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map((err) => err.msg),
          message: "Validation failed",
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
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/classes/:id - Delete class (Admin only)
  async deleteClass(req, res, next) {
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
    } catch (err) {
      next(err);
    }
  }

  // GET /api/classes/available - Get available classes (not full)
  async getAvailableClasses(req, res, next) {
    try {
      const classes = await Class.find({
        isActive: true,
        date: { $gte: new Date() }, // Only future classes
        $expr: { $lt: ["$currentStudents", "$maxStudents"] }, // Not full
      }).sort({ date: 1, time: 1 });

      res.json({
        success: true,
        data: classes,
        message: "Available classes retrieved successfully",
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ClassController();
