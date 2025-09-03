module.exports = {
  port: process.env.PORT || 4000,
  debug: process.env.NODE_ENV !== "production",
  mongodb: {
    url: process.env.MONGODB_URL || "mongodb://localhost:27017/nodestart",
  },
  session: {
    secret: process.env.SESSION_SECRET || "your-default-secret-key",
    cookie_secret: process.env.COOKIE_SECRET || "your-default-cookie-secret",
  },
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  },
  zarinpal: {
    merchant_id:
      process.env.ZARINPAL_MERCHANT_ID ||
      "12345678-1234-1234-1234-123456789012",
    sandbox: process.env.ZARINPAL_SANDBOX === "true",
  },
};
