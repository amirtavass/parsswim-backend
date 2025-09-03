const passport = require("passport");
const localStrategy = require("passport-local").Strategy;
const User = require("../models/user");
const bcrypt = require("bcrypt");

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  let user = await User.findById(id);
  if (user) done(null, user);
});

// Register strategy
passport.use(
  "local.register",
  new localStrategy(
    {
      usernameField: "name",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, name, password, done) => {
      try {
        // Check if user with this name already exists
        let existingUser = await User.findOne({ name: req.body.name });
        if (existingUser) {
          return done(
            null,
            false,
            req.flash("errors", "This user with name exists")
          );
        }

        // Check if email already exists
        let existingEmail = await User.findOne({ email: req.body.email });
        if (existingEmail) {
          return done(
            null,
            false,
            req.flash("errors", "This email is already registered")
          );
        }

        // Create new user with ALL required fields
        const newUser = new User({
          name: req.body.name,
          email: req.body.email,
          phone: req.body.phone,
          age: req.body.age || null,
          password: bcrypt.hashSync(req.body.password, 8),
          balance: req.body.balance || 0,
          swimmingType: req.body.swimmingType || "normal",
          skillLevel: req.body.skillLevel || "beginner",
        });

        await newUser.save();
        done(null, newUser);
      } catch (error) {
        console.error("Registration error:", error);
        return done(error, false, { message: error.message });
      }
    }
  )
);

// Login strategy - updated to allow login with either name or email
passport.use(
  "local.login",
  new localStrategy(
    {
      usernameField: "name",
      passwordField: "password",
      passReqToCallback: true,
    },
    async (req, name, password, done) => {
      try {
        // Try to find user by name or email
        let user = await User.findOne({
          $or: [{ name: req.body.name }, { email: req.body.name }],
        });

        if (!user || !bcrypt.compareSync(req.body.password, user.password)) {
          return done(
            null,
            false,
            req.flash("errors", "Your information isn't correct")
          );
        }

        done(null, user);
      } catch (error) {
        console.error("Login error:", error);
        return done(error, false, { message: error.message });
      }
    }
  )
);
