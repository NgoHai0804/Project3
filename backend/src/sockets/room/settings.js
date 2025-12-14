// settings.js
// Xử lý cập nhật cài đặt phòng (update_room_settings)

const RoomService = require("../../services/room.service");
const { log } = require("./helpers");

/** ----------------- UPDATE ROOM SETTINGS ----------------- */
async function handleUpdateRoomSettings(io, socket, data) {
  const { roomId, playerMarks, turnTimeLimit, firstTurn } = data;
  const userId = socket.user._id;
  const username = socket.user.username;
  const nickname = socket.user.nickname || socket.user.username;
  const roomIdStr = roomId.toString();

  log("update_room_settings được gọi", { roomId: roomIdStr, userId, username, playerMarks, turnTimeLimit, firstTurn });

  try {
    const room = await RoomService.getRoomById(roomIdStr);
    if (!room) {
      socket.emit("room_settings_error", { message: "Phòng không tồn tại" });
      return;
    }

    // Chỉ chủ phòng mới có thể chỉnh sửa
    if (room.hostId?.toString() !== userId.toString()) {
      socket.emit("room_settings_error", { message: "Chỉ chủ phòng mới có thể chỉnh sửa cài đặt" });
      return;
    }

    // Chỉ cho phép chỉnh sửa khi phòng đang ở trạng thái "waiting"
    if (room.status !== "waiting") {
      socket.emit("room_settings_error", { message: "Chỉ có thể chỉnh sửa cài đặt khi phòng chưa bắt đầu game" });
      return;
    }

    // Validate playerMarks nếu có
    if (playerMarks) {
      const marks = Object.values(playerMarks);
      const xCount = marks.filter(m => m === 'X').length;
      const oCount = marks.filter(m => m === 'O').length;
      
      if (room.players.length >= 2) {
        if (xCount !== 1 || oCount !== 1) {
          socket.emit("room_settings_error", { message: "Phải có đúng 1 người chơi X và 1 người chơi O" });
          return;
        }
      }
    }

    // Validate turnTimeLimit nếu có
    if (turnTimeLimit !== undefined) {
      if (turnTimeLimit < 10 || turnTimeLimit > 300) {
        socket.emit("room_settings_error", { message: "Thời gian mỗi lượt phải từ 10 đến 300 giây" });
        return;
      }
    }

    // Validate firstTurn nếu có
    if (firstTurn !== undefined) {
      if (firstTurn !== 'X' && firstTurn !== 'O') {
        socket.emit("room_settings_error", { message: "Người đi trước phải là X hoặc O" });
        return;
      }
    }

    // Cập nhật room
    const updateData = {};
    if (playerMarks) {
      updateData.playerMarks = playerMarks;
    }
    if (turnTimeLimit !== undefined) {
      updateData.turnTimeLimit = turnTimeLimit;
    }
    if (firstTurn !== undefined) {
      updateData.firstTurn = firstTurn;
    }

    const roomAfter = await RoomService.updateRoom(roomIdStr, updateData);

    // Convert playerMarks Map to Object for JSON
    const playerMarksObj = roomAfter.playerMarks 
      ? (roomAfter.playerMarks instanceof Map 
          ? Object.fromEntries(roomAfter.playerMarks) 
          : roomAfter.playerMarks)
      : {};

    // Thông báo cho tất cả user trong phòng
    io.to(roomIdStr).emit("room_settings_updated", {
      room: roomAfter,
      playerMarks: playerMarksObj,
      turnTimeLimit: roomAfter.turnTimeLimit,
      firstTurn: roomAfter.firstTurn || 'X',
      message: `${nickname} đã cập nhật cài đặt phòng`,
      timestamp: new Date().toISOString()
    });

    io.to(roomIdStr).emit("room_update", {
      room: roomAfter,
      message: "Cài đặt phòng đã được cập nhật",
      timestamp: new Date().toISOString()
    });

    log("Cài đặt phòng đã được cập nhật", { roomId: roomIdStr, userId, username });

  } catch (err) {
    log("Lỗi update_room_settings", err.message);
    socket.emit("room_settings_error", { message: err.message });
  }
}

module.exports = {
  handleUpdateRoomSettings
};
