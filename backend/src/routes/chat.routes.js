// chat.routes.js
// Định nghĩa các route liên quan đến tin nhắn (trong phòng và chat riêng tư)
const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/auth.middleware");
const chatController = require("../controllers/chat.controller");

// Tất cả route đều yêu cầu đăng nhập
router.use(verifyToken);
// Lấy lịch sử chat của phòng
router.get("/room/:roomId", chatController.getRoomChat);
// Lấy lịch sử chat riêng
router.get("/private/:userId", chatController.getPrivateChat);
// Đánh dấu tin nhắn đã đọc
router.post("/read/:messageId", chatController.markAsRead);

module.exports = router;
