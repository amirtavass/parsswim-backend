const { validationResult } = require("express-validator");
const Product = require("../models/product");
let controller = require("./controller");

class ProductController extends controller {
  // GET /products - Get all products
  async getAllProducts(req, res, next) {
    try {
      let filter = { isActive: true };

      // Add filters based on query parameters
      if (req.query.category) {
        filter.category = req.query.category;
      }

      const products = await Product.find(filter).sort({ createdAt: -1 });

      res.json({
        success: true,
        data: products,
        message: "Products retrieved successfully",
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /products/:id - Get single product
  async getOneProduct(req, res, next) {
    try {
      const product = await Product.findById(req.params.id);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      res.json({
        success: true,
        data: product,
        message: "Product retrieved successfully",
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /products - Create new product (Admin only)
  async createProduct(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map((err) => err.msg),
          message: "Validation failed",
        });
      }

      const newProduct = new Product({
        name: req.body.name,
        price: req.body.price,
        category: req.body.category,
        description: req.body.description,
        image: req.body.image,
        inStock: req.body.inStock !== undefined ? req.body.inStock : true,
        quantity: req.body.quantity || 0,
        brand: req.body.brand,
        size: req.body.size,
        color: req.body.color,
      });

      await newProduct.save();

      res.status(201).json({
        success: true,
        data: newProduct,
        message: "Product created successfully",
      });
    } catch (err) {
      next(err);
    }
  }

  // PUT /products/:id - Update product (Admin only)
  async updateProduct(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array().map((err) => err.msg),
          message: "Validation failed",
        });
      }

      const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true }
      );

      if (!updatedProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      res.json({
        success: true,
        data: updatedProduct,
        message: "Product updated successfully",
      });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /products/:id - Delete product (Admin only)
  async deleteProduct(req, res, next) {
    try {
      const deletedProduct = await Product.findByIdAndDelete(req.params.id);

      if (!deletedProduct) {
        return res.status(404).json({
          success: false,
          message: "Product not found",
        });
      }

      res.json({
        success: true,
        message: "Product deleted successfully",
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProductController();
