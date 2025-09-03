const { check } = require("express-validator");
const validator = require("./validator");

module.exports = new (class AuthValidator extends validator {
  login() {
    return [
      check("name", "Username or email can't be empty").not().isEmpty(),
      check("password", "Password length must be at least 5").isLength({
        min: 5,
      }),
    ];
  }

  register() {
    return [
      check("name", "Name can't be empty").not().isEmpty(),
      check("email", "Valid email is required").isEmail(),
      check("phone", "Phone number is required").not().isEmpty(),
      check("password", "Password length must be at least 5").isLength({
        min: 5,
      }),
    ];
  }
})();
