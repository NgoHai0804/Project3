// friend.controller.js


const friendService = require("../services/friend.service");
const response = require("../utils/response");

// Lấy danh sách bạn bè
async function getFriends(req, res) {
  try {
    const userId = req.user._id;
    const friends = await friendService.getFriendsList(userId);
    return response.success(res, friends, "Get friends list success");
  } catch (err) {
    console.error("Lỗi khi lấy danh sách bạn bè:", err);
    return response.error(res, err.message);
  }
}

// Gửi lời mời kết bạn
async function sendRequest(req, res) {
  try {
    if (!req.user || !req.user._id) {
      return response.error(res, "Bạn chưa đăng nhập hoặc token không hợp lệ");
    }

    const { addresseeId } = req.body;
    if (!addresseeId) {
      return response.error(res, "Thiếu addresseeId trong body");
    }

    const requesterId = req.user._id;
    const request = await friendService.sendFriendRequest(requesterId, addresseeId);
    return response.success(res, request, "Friend request sent");
  } catch (err) {
    console.error("Lỗi khi gửi lời mời kết bạn:", err);
    return response.error(res, err.message);
  }
}


// Lấy danh sách lời mời kết bạn đang chờ
async function getRequests(req, res) {
  try {
    const userId = req.user._id;
    const requests = await friendService.getPendingRequests(userId);
    return response.success(res, requests, "Get pending requests success");
  } catch (err) {
    console.error("Lỗi khi lấy danh sách lời mời kết bạn đang chờ:", err);
    return response.error(res, err.message);
  }
}

// Chấp nhận lời mời kết bạn
async function acceptRequest(req, res) {
  try {
    const userId = req.user._id;
    const { requesterId } = req.body;

    const result = await friendService.acceptFriendRequest(requesterId, userId);
    return response.success(res, result, "Friend request accepted");
  } catch (err) {
    console.error("Lỗi khi chấp nhận lời mời kết bạn:", err);
    return response.error(res, err.message);
  }
}

// Hủy hoặc từ chối lời mời kết bạn
async function cancelRequest(req, res) {
  try {
    const userId = req.user._id;
    if (!userId) return response.error(res, "userId not founded", 400);
    const { requesterId } = req.body;

    await friendService.cancelFriendRequest(requesterId, userId);
    return response.success(res, {}, "Friend request canceled");
  } catch (err) {
    console.error("Lỗi khi hủy lời mời kết bạn:", err);
    return response.error(res, err.message);
  }
}

// Tìm kiếm người dùng
async function searchUser(req, res) {
  try {
    const { nickname, userID } = req.body;
    const excludeUserId = req.user._id;
    if ((!nickname || nickname.trim() === '') && (!userID)) {
      return response.error(res, "Thiếu tham số tìm kiếm (nickname hoặc userID)", 400);
    }
    const searchNickname = nickname ? nickname.trim() : null;
    const users = await friendService.searchUsers(searchNickname, userID, excludeUserId);
    if (users.length === 0) {
      return response.success(res, [], "Không tìm thấy User phù hợp");
    }
    return response.success(res, users, "Tìm kiếm thành công");
  } catch (err) {
    console.error("Lỗi khi tìm kiếm người dùng:", err);
    return response.error(res, err.message);
  }
}

// Xóa bạn bè
async function removeFriend(req, res) {
  try {
    const userId = req.user._id;
    const { friendId } = req.body;

    await friendService.removeFriend(userId, friendId);
    return response.success(res, {}, "Friend removed");
  } catch (err) {
    console.error("Lỗi khi xóa bạn bè:", err);
    return response.error(res, err.message);
  }
}

module.exports = {
  getFriends,
  sendRequest,
  getRequests,
  acceptRequest,
  cancelRequest,
  searchUser,
  removeFriend,
};
