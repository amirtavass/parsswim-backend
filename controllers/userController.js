const { validationResult } = require("express-validator");
let User = require("models/user");
let controller = require("./controller");

class UserController extends controller {
  async getAllUsers(req, res, next) {
    try {
      let users = await User.find({});
      res.render("users", {
        users: users,
        title: "all users",
        errors: req.flash("errors"),
        message: req.flash("message"),
      });
    } catch (err) {
      next(err);
    }
  }
  async seeOneUser(req, res, next) {
    try {
      // let user = await User.findOne({_id:req.params.id})
      let user = await User.findById(req.params.id);

      if (user) res.render("user", { user: user });
      else this.error("This user was not found", 404);
    } catch (err) {
      next(err);
    }
  }
  async createUser(req, res, next) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        let myErrors = errors.array().map((err) => err.msg);
        req.flash("errors", myErrors);
        return res.redirect("/user");
      }
      req.body.price = parseInt(req.body.price);
      req.body.id = parseInt(req.body.id);
      let newUser = new User({
        price: req.body.price,
        password: req.body.password,
        name: req.body.name,
      });
      await newUser.save();
      req.flash("message", "user added successfully");
      return res.redirect("/user");
    } catch (err) {
      next(err);
    }
  }
  async updateUser(req, res, next) {
    try {
      await User.updateOne({ _id: req.params.id }, { $set: req.body });
      req.flash("message", "user updated successfully");
      return res.redirect("/user");
    } catch (err) {
      next(err);
    }
  }
  async deleteUser(req, res, next) {
    try {
      await User.deleteOne({ _id: req.params.id });
      req.flash("message", "user deleted successfully");
      return res.redirect("/user");
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UserController();
