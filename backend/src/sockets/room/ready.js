// ready.js
// Xử lý đánh dấu sẵn sàng (player_ready)

const RoomService = require("../../services/room.service");
const { log } = require("./helpers");

/** Xử lý khi người chơi đánh dấu sẵn sàng */
async function handlePlayerReady(io, socket, data) {
  const { roomId, isReady } = data;
  const userId = socket.user._id;
  const username = socket.user.username;
  const nickname = socket.user.nickname || socket.user.username;
  const roomIdStr = roomId.toString();

  log("player_ready được gọi", { roomId: roomIdStr, userId, username, isReady });

  try {
    const roomBefore = await RoomService.getRoomById(roomIdStr);
    if (!roomBefore) {
      socket.emit("ready_error", { message: "Phòng không tồn tại" });
      return;
    }
    if (roomBefore.status === "playing") {
      socket.emit("ready_error", { message: "Game đã bắt đầu" });
      return;
    }

    const { room: roomAfter, started, allNonHostReady } = await RoomService.toggleReady({ 
      roomId: roomIdStr, 
      isReady: isReady !== undefined ? isReady : true, 
      userId 
    });

    // Thông báo cho tất cả user trong phòng về sự thay đổi trạng thái ready
    io.to(roomIdStr).emit("player_ready_status", { 
      userId, 
      username,
      isReady: roomAfter.players.find(p => p.userId.toString() === userId.toString())?.isReady || false,
      room: roomAfter,
      allNonHostReady: allNonHostReady,
      message: `${nickname} ${isReady !== false ? 'đã sẵn sàng' : 'đã hủy sẵn sàng'}`,
      timestamp: new Date().toISOString() 
    });

    // Cập nhật trạng thái phòng cho tất cả user
    io.to(roomIdStr).emit("room_update", {
      room: roomAfter,
      allNonHostReady: allNonHostReady,
      message: `${nickname} ${isReady !== false ? 'đã sẵn sàng' : 'đã hủy sẵn sàng'}`,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    log("Lỗi player_ready", err.message);
    socket.emit("ready_error", { message: err.message });
  }
}

module.exports = {
  handlePlayerReady
};
