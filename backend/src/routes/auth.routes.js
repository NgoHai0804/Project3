// auth.routes.js
// Routes cho xác thực



const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Đăng ký
router.post('/register', authController.register);
// Đăng nhập
router.post('/login', authController.login);
// Quên mật khẩu - gửi mã xác nhận
router.post('/forgot-password', authController.forgotPassword);
// Reset mật khẩu với mã xác nhận
router.post('/reset-password', authController.resetPassword);
// Refresh token
router.post('/refresh', authController.refresh);

module.exports = router;
