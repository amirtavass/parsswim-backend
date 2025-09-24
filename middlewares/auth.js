const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }
  next();
};

const requireAdmin = (req, res, next) => {
  console.log("Checking admin access:", {
    sessionId: req.sessionID,
    isAdmin: req.session?.isAdmin,
    adminId: req.session?.adminId,
  });

  if (!req.session || !req.session.isAdmin || !req.session.adminId) {
    return res.status(403).json({
      success: false,
      message: "Admin access required - Please login as admin",
    });
  }
  next();
};

module.exports = {
  requireAuth,
  requireAdmin,
};
