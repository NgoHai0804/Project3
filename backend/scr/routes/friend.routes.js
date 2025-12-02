// friend.routes.js
// Định nghĩa các route liên quan đến quản lý quan hệ bạn bè
// Bao gồm: lấy danh sách bạn bè, gửi/chấp nhận/hủy lời mời, tìm kiếm, xóa bạn
const express = require('express');
const router = express.Router();
const FriendController = require('../controllers/friend.controller');

// Middleware xác thực JWT token
const verifyToken = require('../middlewares/auth.middleware');

// Tất cả route đều yêu cầu đăng nhập
router.use(verifyToken);

// Lấy danh sách bạn bè
router.get('/', FriendController.getFriends);

// Gửi lời mời kết bạn
router.post('/request', FriendController.sendRequest);

// Lấy danh sách lời mời kết bạn
router.get('/requests', FriendController.getRequests);

// Chấp nhận lời mời
router.post('/accept', FriendController.acceptRequest);

// Hủy lời mời / từ chối kết bạn
router.post('/cancel', FriendController.cancelRequest);

// Tìm bạn theo username
router.post('/search', FriendController.searchUser);

// Hủy kết bạn
router.post('/unfriend', FriendController.removeFriend);

module.exports = router;
