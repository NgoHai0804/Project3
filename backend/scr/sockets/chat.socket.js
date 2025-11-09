// chat.socket.js
// Xử lý các event Socket.IO liên quan đến chat realtime (trong phòng hoặc chat riêng tư)
const ChatService = require("../services/chat.service");
const RoomService = require("../services/room.service");

function log(msg, data = null) {
  console.log(`[${new Date().toISOString()}] ${msg}`, data ? JSON.stringify(data, null, 2) : "");
}

module.exports = function chatSocket(io, socket) {
  // Xử lý khi client gửi tin nhắn (có thể là tin nhắn trong phòng hoặc chat riêng)
  socket.on("send_message", async ({ roomId, receiverId, message, type = 'text' }) => {
    try {
      const userId = socket.user._id;
      const username = socket.user.username;
      const roomIdStr = roomId?.toString();
      const receiverIdStr = receiverId?.toString();

      if (!message || !message.trim()) {
        socket.emit("chat_error", { message: "Tin nhắn không được để trống" });
        return;
      }

      // Kiểm tra user có trong phòng không (nếu là chat trong phòng)
      if (roomIdStr) {
        const room = await RoomService.getRoomById(roomIdStr);
        if (!room) {
          socket.emit("chat_error", { message: "Phòng không tồn tại" });
          return;
        }

        const player = room.players.find(p => p.userId.toString() === userId.toString());
        if (!player) {
          socket.emit("chat_error", { message: "Bạn không ở trong phòng này" });
          return;
        }
      }

      // Lưu tin nhắn vào DB
      const savedMessage = await ChatService.saveMessage({
        roomId: roomIdStr || null,
        senderId: userId,
        receiverId: receiverIdStr || null,
        type,
        message: message.trim(),
      });

      // Chuẩn bị dữ liệu tin nhắn để gửi cho tất cả client trong phòng hoặc người nhận
      const messageData = {
        _id: savedMessage._id,
        message: savedMessage.message,
        type: savedMessage.type,
        senderId: savedMessage.senderId,
        sender: {
          _id: savedMessage.senderId._id || savedMessage.senderId,
          username: savedMessage.senderId.username || username,
          nickname: savedMessage.senderId.nickname,
          avatarUrl: savedMessage.senderId.avatarUrl,
        },
        roomId: roomIdStr || null,
        receiverId: receiverIdStr || null,
        isRead: false,
        createdAt: savedMessage.createdAt,
        timestamp: new Date(savedMessage.createdAt).getTime(),
      };

      if (roomIdStr) {
        // Tin nhắn trong phòng: gửi cho tất cả người trong phòng
        io.to(roomIdStr).emit("message_received", messageData);
      } else if (receiverIdStr) {
        // Tin nhắn riêng tư: gửi cho người nhận (sử dụng room với userId)
        io.to(receiverIdStr).emit("message_received", messageData);
        // Gửi lại cho người gửi để xác nhận đã gửi thành công
        socket.emit("message_received", messageData);
      } else {
        socket.emit("chat_error", { message: "Cần roomId hoặc receiverId" });
      }

      log("Message sent", { roomId: roomIdStr, sender: username });
    } catch (err) {
      log("send_message error", err.message);
      socket.emit("chat_error", { message: err.message || "Lỗi khi gửi tin nhắn" });
    }
  });

  // Xử lý khi client yêu cầu lấy lịch sử chat của phòng
  socket.on("get_room_messages", async ({ roomId, limit = 50 }) => {
    try {
      const userId = socket.user._id;
      const roomIdStr = roomId?.toString();

      if (!roomIdStr) {
        socket.emit("chat_error", { message: "Room ID không hợp lệ" });
        return;
      }

      // Kiểm tra user có trong phòng không
      const room = await RoomService.getRoomById(roomIdStr);
      if (!room) {
        socket.emit("chat_error", { message: "Phòng không tồn tại" });
        return;
      }

      const player = room.players.find(p => p.userId.toString() === userId.toString());
      if (!player) {
        socket.emit("chat_error", { message: "Bạn không ở trong phòng này" });
        return;
      }

      // Lấy lịch sử chat của phòng
      const messages = await ChatService.getRoomMessages(roomIdStr, limit);

      // Đánh dấu tất cả tin nhắn trong phòng là đã đọc
      await ChatService.markRoomMessagesAsRead(roomIdStr, userId);

      socket.emit("room_messages", { roomId: roomIdStr, messages });
      log("Room messages sent", { roomId: roomIdStr, count: messages.length });
    } catch (err) {
      log("get_room_messages error", err.message);
      socket.emit("chat_error", { message: err.message || "Lỗi khi lấy lịch sử chat" });
    }
  });

  // Xử lý khi client yêu cầu lấy lịch sử chat riêng giữa 2 người
  socket.on("get_private_messages", async ({ userId, limit = 50 }) => {
    try {
      const currentUserId = socket.user._id;
      const otherUserId = userId?.toString();

      if (!otherUserId) {
        socket.emit("chat_error", { message: "User ID không hợp lệ" });
        return;
      }

      // Lấy lịch sử chat riêng giữa hai người
      const messages = await ChatService.getPrivateMessages(currentUserId, otherUserId, limit);

      // Format dữ liệu tin nhắn để gửi về client
      const formattedMessages = messages.map(msg => ({
        _id: msg._id,
        message: msg.message,
        type: msg.type,
        senderId: msg.senderId?._id || msg.senderId,
        receiverId: msg.receiverId?._id || msg.receiverId,
        sender: {
          _id: msg.senderId?._id || msg.senderId,
          username: msg.senderId?.username,
          nickname: msg.senderId?.nickname,
          avatarUrl: msg.senderId?.avatarUrl,
        },
        receiver: {
          _id: msg.receiverId?._id || msg.receiverId,
          username: msg.receiverId?.username,
          nickname: msg.receiverId?.nickname,
          avatarUrl: msg.receiverId?.avatarUrl,
        },
        isRead: msg.isRead || false,
        createdAt: msg.createdAt,
        timestamp: new Date(msg.createdAt).getTime(),
      }));

      socket.emit("private_messages", { 
        userId: otherUserId, 
        messages: formattedMessages 
      });
      
      log("Private messages sent", { userId: otherUserId, count: formattedMessages.length });
    } catch (err) {
      log("get_private_messages error", err.message);
      socket.emit("chat_error", { message: err.message || "Lỗi khi lấy lịch sử chat" });
    }
  });
};