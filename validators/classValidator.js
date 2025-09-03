const { check } = require("express-validator");
const validator = require("./validator");

module.exports = new (class ClassValidator extends validator {
  handle() {
    return [
      check("title", "Title is required").not().isEmpty(),
      check("classType", "Class type is required").isIn([
        "کلاس خصوصی ۱۲ جلسه",
        "کلاس پدر و فرزند",
        "کلاس آمادگی مسابقات",
        "سانس آزاد استخر",
        "جلسه آزمایشی رایگان",
      ]),
      check("duration", "Duration must be a positive number").isInt({ min: 1 }),
      check("date", "Valid date is required").isISO8601(),
      check("time", "Time is required").not().isEmpty(),
      check("maxStudents", "Max students must be a positive number").isInt({
        min: 1,
      }),
      check("price", "Price must be a positive number").isNumeric({ min: 0 }),
      check("instructor", "Instructor is required").isIn([
        "مربی اول",
        "مربی دوم",
        "هر دو مربی",
      ]),
    ];
  }
})();
