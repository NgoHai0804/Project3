// helpers.js
// Helper functions game socket

const UserService = require("../../services/user.service");

/** Helper: Format thời gian hiện tại để log */
function now() { 
  return `[${new Date().toISOString().replace("T", " ").split(".")[0]}]`; 
}

/** Helper: Log message với dữ liệu kèm theo */
function log(msg, data = null) { 
  console.log(now(), msg, data ? JSON.stringify(data, null, 2) : ""); 
}

/** Helper: Cập nhật trạng thái thành 'online' cho tất cả người chơi trong phòng sau khi game kết thúc */
async function updatePlayersStatusToOnline(roomIdStr) {
  try {
    const RoomService = require("../../services/room.service");
    const room = await RoomService.getRoomById(roomIdStr);
    if (!room || !room.players) return;
    
    for (const player of room.players) {
      if (player.userId) {
        await UserService.updateUserStatus(player.userId.toString(), "online");
      }
    }
  } catch (err) {
    log("Lỗi khi cập nhật trạng thái players thành online sau khi game kết thúc", err.message);
  }
}

module.exports = {
  now,
  log,
  updatePlayersStatusToOnline
};
