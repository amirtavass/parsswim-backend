const { verifyAdmin } = require("../lib/jwt");

module.exports = function adminJwtMiddleware(req, res, next) {
  const token =
    req.cookies.admin_token ||
    (req.headers.authorization &&
      req.headers.authorization.replace("Bearer ", ""));
  if (!token) {
    return res
      .status(403)
      .json({ success: false, message: "Admin access required (no token)" });
  }
  try {
    const decoded = verifyAdmin(token);
    req.admin = decoded;
    next();
  } catch (err) {
    return res
      .status(403)
      .json({
        success: false,
        message: "Admin access required (invalid token)",
      });
  }
};
