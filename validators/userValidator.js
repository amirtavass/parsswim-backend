const { check } = require("express-validator");
const validator = require("./validator");

module.exports = new (class UserValidator extends validator {
  handle() {
    return [
      check("password", "password length must at least 5").isLength({ min: 5 }),
    ];
  }
})();
