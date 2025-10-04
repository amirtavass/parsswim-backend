const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || "super-secret-admin-key";
const JWT_EXPIRES_IN = "2h";

exports.signAdmin = (admin) => {
  return jwt.sign(
    {
      id: admin.id,
      username: admin.username,
      role: admin.role || "admin",
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

exports.verifyAdmin = (token) => {
  return jwt.verify(token, JWT_SECRET);
};
