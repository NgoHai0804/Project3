// join.js
// Xử lý tham gia phòng (join_room)

const RoomService = require("../../services/room.service");
const { log } = require("./helpers");

/** Map theo dõi socket nào đang ở phòng nào (để xử lý disconnect) */
const socketToRoom = new Map();

/** Map theo dõi các request join đang được xử lý (tránh xử lý trùng lặp) */
const joiningUsers = new Map();

/** Xử lý khi người chơi tham gia phòng */
async function handleJoinRoom(io, socket, data) {
  const { roomId, password } = data;
  const userId = socket.user._id;
  const username = socket.user.username;
  const nickname = socket.user.nickname || socket.user.username;
  const joinKey = `${userId}_${roomId}`;

  // Kiểm tra xem đã có request join đang xử lý chưa
  if (joiningUsers.has(joinKey)) {
    log("join_room request trùng lặp đã bị bỏ qua", { roomId, userId, username });
    return;
  }

  joiningUsers.set(joinKey, true);
  log("Yêu cầu join_room", { roomId, userId, username });

  try {
    // Kiểm tra xem user đã ở trong phòng chưa (trước khi join)
    const roomBefore = await RoomService.getRoomById(roomId.toString());
    const wasAlreadyInRoom = roomBefore?.players?.some((p) => p.userId.toString() === userId.toString());

    const roomAfterJoin = await RoomService.joinRoom({ roomId, password, userId, username });

    const roomIdStr = roomId.toString();
    socketToRoom.set(socket.id, roomIdStr);
    socket.join(roomIdStr);

    // Gửi xác nhận thành công cho client vừa join
    socket.emit("join_success", { 
      room: roomAfterJoin,
      message: wasAlreadyInRoom ? "Bạn đã kết nối lại với phòng" : "Bạn đã tham gia phòng thành công",
      timestamp: new Date().toISOString()
    });

    // Chỉ thông báo cho các user khác nếu đây là lần tham gia mới (không phải reconnect)
    if (!wasAlreadyInRoom) {
      // Thông báo cho các user khác về người chơi mới
      socket.to(roomIdStr).emit("player_joined", { 
        userId, 
        username,
        nickname,
        room: roomAfterJoin,
        message: `${nickname} đã tham gia phòng`,
        timestamp: new Date().toISOString() 
      });

      // Cập nhật trạng thái phòng cho tất cả user trong phòng
      io.to(roomIdStr).emit("room_update", {
        room: roomAfterJoin,
        message: `${nickname} đã tham gia phòng`,
        timestamp: new Date().toISOString()
      });
    } else {
      // Nếu là reconnect, chỉ cập nhật room cho user đó
      socket.emit("room_update", {
        room: roomAfterJoin,
        message: "Đã kết nối lại với phòng",
        timestamp: new Date().toISOString()
      });
    }

    log("Người chơi đã tham gia thành công", { roomId: roomIdStr, userId, username, wasReconnect: wasAlreadyInRoom });

  } catch (err) {
    log("Lỗi join_room", err.message);
    socket.emit("join_error", { message: err.message });
  } finally {
    // Xóa khỏi map sau 1 giây để cho phép retry nếu cần
    setTimeout(() => {
      joiningUsers.delete(joinKey);
    }, 1000);
  }
}

module.exports = {
  handleJoinRoom,
  socketToRoom
};
