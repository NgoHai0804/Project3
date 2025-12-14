// chat.service.js - xử lý logic tin nhắn
const Message = require("../models/message.model");
const logger = require("../utils/logger");

// Lưu tin nhắn vào database
async function saveMessage({ roomId, senderId, receiverId, type = 'text', message }) {
  try {
    const newMessage = await Message.create({
      roomId: roomId || null,
      senderId,
      receiverId: receiverId || null,
      type,
      message,
      isRead: false,
    });

    const populatedMessage = await Message.findById(newMessage._id)
      .populate('senderId', 'nickname avatarUrl')
      .populate('receiverId', 'nickname avatarUrl');

    logger.info(`Đã lưu tin nhắn: ${newMessage._id}`);
    return populatedMessage;
  } catch (err) {
    logger.error("Lỗi khi lưu tin nhắn: %o", err);
    throw err;
  }
}

// Lấy lịch sử chat của phòng
async function getRoomMessages(roomId, limit = 50) {
  try {
    const messages = await Message.find({ roomId })
      .populate('senderId', 'nickname avatarUrl')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return messages.reverse();
  } catch (err) {
    logger.error("Lỗi khi lấy tin nhắn phòng: %o", err);
    throw err;
  }
}

// Lấy lịch sử chat riêng tư giữa 2 người
async function getPrivateMessages(userId1, userId2, limit = 50) {
  try {
    const messages = await Message.find({
      $or: [
        { senderId: userId1, receiverId: userId2 },
        { senderId: userId2, receiverId: userId1 },
      ],
      roomId: null,
    })
      .populate('senderId', 'nickname avatarUrl')
      .populate('receiverId', 'nickname avatarUrl')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return messages.reverse();
  } catch (err) {
    logger.error("Lỗi khi lấy tin nhắn riêng tư: %o", err);
    throw err;
  }
}

// Đánh dấu tin nhắn là đã đọc
async function markMessageAsRead(messageId, userId) {
  try {
    const message = await Message.findById(messageId);
    if (!message) throw new Error("Message not found");

    if (message.receiverId && message.receiverId.toString() === userId.toString()) {
      message.isRead = true;
      await message.save();
    }

    return message;
  } catch (err) {
    logger.error("Lỗi khi đánh dấu tin nhắn đã đọc: %o", err);
    throw err;
  }
}

// Đánh dấu tất cả tin nhắn trong phòng là đã đọc
async function markRoomMessagesAsRead(roomId, userId) {
  try {
    await Message.updateMany(
      { roomId, receiverId: userId, isRead: false },
      { isRead: true }
    );
    return true;
  } catch (err) {
    logger.error("Lỗi khi đánh dấu tất cả tin nhắn phòng đã đọc: %o", err);
    throw err;
  }
}

module.exports = {
  saveMessage,
  getRoomMessages,
  getPrivateMessages,
  markMessageAsRead,
  markRoomMessagesAsRead,
};
