const { check } = require("express-validator");
const validator = require("./validator");

module.exports = new (class ProductValidator extends validator {
  handle() {
    return [
      check("name", "Product name is required").not().isEmpty(),
      check("price", "Price must be a positive number").isNumeric({ min: 0 }),
      check("category", "Category is required").isIn([
        "swimwear",
        "swimgoggles",
        "swimfins",
        "swimequipment",
      ]),
    ];
  }
})();
