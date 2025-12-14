// invite.js
// Xử lý mời bạn vào phòng (invite_to_room)

const RoomService = require("../../services/room.service");
const { log } = require("./helpers");

/** ----------------- INVITE TO ROOM ----------------- */
async function handleInviteToRoom(io, socket, data) {
  const { roomId, friendId } = data;
  const userId = socket.user._id;
  const username = socket.user.username;
  const roomIdStr = roomId?.toString();
  const friendIdStr = friendId?.toString();

  log("invite_to_room", { roomId: roomIdStr, inviter: username, friendId: friendIdStr });

  try {
    if (!roomIdStr || !friendIdStr) {
      socket.emit("invite_error", { message: "Thiếu roomId hoặc friendId" });
      return;
    }

    const room = await RoomService.getRoomById(roomIdStr);
    if (!room) {
      socket.emit("invite_error", { message: "Phòng không tồn tại" });
      return;
    }

    // Kiểm tra xem user có trong phòng không
    const inviter = room.players.find(p => p.userId.toString() === userId.toString());
    if (!inviter) {
      socket.emit("invite_error", { message: "Bạn không ở trong phòng này" });
      return;
    }

    // Gửi notification cho người được mời (chỉ gửi đến friendId, không gửi cho người mời)
    const inviteData = {
      roomId: roomIdStr,
      roomName: room.name,
      inviterId: userId.toString(),
      inviter: {
        _id: userId,
        username: username,
        nickname: socket.user.nickname,
        avatarUrl: socket.user.avatarUrl,
      },
      timestamp: new Date().toISOString(),
    };
    
    log("Sending room invite", { to: friendIdStr, roomId: roomIdStr, inviter: username });
    io.to(friendIdStr).emit("room:invite", inviteData);

    // Xác nhận cho người gửi
    socket.emit("invite_success", {
      message: `Đã gửi lời mời đến ${friendIdStr}`,
      timestamp: new Date().toISOString(),
    });

    log("Room invite sent", { roomId: roomIdStr, inviter: username, friendId: friendIdStr });
  } catch (err) {
    log("invite_to_room error", err.message);
    socket.emit("invite_error", { message: err.message });
  }
}

module.exports = {
  handleInviteToRoom
};
