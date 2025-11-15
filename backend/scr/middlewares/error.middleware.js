// error.middleware.js - xử lý lỗi
const logger = require("../utils/logger");

module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  logger.error("[%s] %s - %s", req.method, req.originalUrl, message);
  if (process.env.NODE_ENV === "development" && err.stack) {
    console.error(err.stack);
  }

  res.status(statusCode).json({
    status: "error",
    message,
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
};
