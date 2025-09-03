const { check } = require("express-validator");
const validator = require("./validator");

module.exports = new (class editUserValidator extends validator {
  handle() {
    return [check("name", "name should not be empty").not().isEmpty()];
  }

  // Add custom file validation method
  validateFile() {
    return (req, res, next) => {
      if (!req.file) {
        req.flash("errors", ["Please select an image file"]);
        return res.redirect("/dashboard");
      }
      next();
    };
  }
})();
