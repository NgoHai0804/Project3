// user.routes.js
// Định nghĩa các route liên quan đến quản lý thông tin người dùng
// Bao gồm: xem/cập nhật profile, xem leaderboard, đổi mật khẩu
const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/auth.middleware");
const userController = require("../controllers/user.controller");

// Tất cả route đều yêu cầu đăng nhập (trừ leaderboard có thể public)
router.get("/profile", verifyToken, userController.getProfile);
router.get("/profile/:userId", verifyToken, userController.getUserProfile);
router.put("/profile", verifyToken, userController.updateProfile);
router.post("/change-password", verifyToken, userController.changePassword);
router.get("/leaderboard", userController.getLeaderboard);

// Routes cho lịch sử chơi
router.get("/game-history", verifyToken, userController.getGameHistory);
router.get("/game-history/:userId", verifyToken, userController.getUserGameHistory);
router.get("/game/:gameId", verifyToken, userController.getGameDetail);

module.exports = router;
