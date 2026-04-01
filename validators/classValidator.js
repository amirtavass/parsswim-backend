const { check } = require("express-validator");
const validator = require("./validator");

module.exports = new (class ClassValidator extends validator {
  handle() {
    return [
      check("title", "Title is required").not().isEmpty(),
      check("classType", "Class type is required").isIn([
        "Free Trial Session",
        "Private 12-Session",
        "Parent & Child",
        "Competition Prep",
        "Free Pool Session",
        "Group Beginner",
        "Advanced Training",
      ]),
      check("duration", "Duration must be a positive number").isInt({ min: 1 }),
      check("date", "Valid date is required").isISO8601(),
      check("time", "Time is required").not().isEmpty(),
      check("maxStudents", "Max students must be a positive number").isInt({
        min: 1,
      }),
      check("price", "Price must be a positive number").isNumeric({ min: 0 }),
      check("instructor", "Instructor is required").isIn([
        "Primary Coach",
        "Secondary Coach",
        "Both Coaches",
      ]),
    ];
  }
})();
