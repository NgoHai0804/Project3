// logger.js
// Utility xử lý log hệ thống sử dụng Winston
// 
// Chức năng:
// - Log thông tin, cảnh báo, lỗi ra console và file
// - Quản lý log theo level (info, warn, error)
// - Giúp debug và theo dõi trạng thái server

const { createLogger, transports, format } = require("winston");

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  transports: [
    // Ghi log ra console với màu sắc
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(
          ({ level, message, timestamp, stack }) =>
            `[${timestamp}] ${level}: ${stack || message}`
        )
      ),
    }),
    // Ghi log lỗi (error level) ra file riêng
    new transports.File({ filename: "logs/error.log", level: "error" }),
  ],
});

module.exports = logger;
