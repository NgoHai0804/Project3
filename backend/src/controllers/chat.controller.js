// chat.controller.js
// Controller xử lý các request liên quan đến tin nhắn (trong phòng và chat riêng tư)
const response = require("../utils/response");
const chatService = require("../services/chat.service");
const UserService = require("../services/user.service");
const logger = require("../utils/logger");

// Lấy lịch sử chat của một phòng chơi
async function getRoomChat(req, res) {
  try {
    const { roomId } = req.params;
    const messages = await chatService.getRoomMessages(roomId, 50);
    return response.success(res, { messages }, "Get room chat success");
  } catch (err) {
    logger.error(`Lỗi khi lấy chat phòng: ${err}`);
    return response.error(res, err.message, 500);
  }
}

// Lấy lịch sử chat riêng tư giữa user hiện tại và một user khác
async function getPrivateChat(req, res) {
  try {
    const { userId } = req.params;
    const currentUserId = req.user._id;
    
    // Lấy thông tin của người bạn đang chat
    const friend = await UserService.getUserProfile(userId);
    
    // Lấy lịch sử tin nhắn riêng tư (giới hạn 50 tin nhắn gần nhất)
    const messages = await chatService.getPrivateMessages(currentUserId, userId, 50);
    
    return response.success(res, { messages, friend }, "Get private chat success");
  } catch (err) {
    logger.error(`Lỗi khi lấy chat riêng tư: ${err}`);
    return response.error(res, err.message, 500);
  }
}

// Đánh dấu một tin nhắn cụ thể là đã đọc
async function markAsRead(req, res) {
  try {
    const { messageId } = req.params;
    const userId = req.user._id;
    
    await chatService.markMessageAsRead(messageId, userId);
    return response.success(res, {}, "Message marked as read");
  } catch (err) {
    logger.error(`Lỗi khi đánh dấu tin nhắn đã đọc: ${err}`);
    return response.error(res, err.message, 500);
  }
}

module.exports = {
  getRoomChat,
  getPrivateChat,
  markAsRead,
};
