// kick.js
// Xử lý đuổi người chơi (kick_player)

const RoomService = require("../../services/room.service");
const UserService = require("../../services/user.service");
const { getGameState, roomGames } = require("../game/state");
const { cleanupMoveLock } = require("../game/move");
const { cleanupPingTracking, cleanupAllPingTracking } = require("./ping");
const { socketToRoom } = require("./join");
const { log } = require("./helpers");

/** ----------------- KICK PLAYER ----------------- */
async function handleKickPlayer(io, socket, data) {
  const { roomId, targetUserId } = data;
  const userId = socket.user._id;
  const username = socket.user.username;
  const nickname = socket.user.nickname || socket.user.username;
  const roomIdStr = roomId.toString();
  const targetUserIdStr = targetUserId.toString();

  log("kick_player được gọi", { roomId: roomIdStr, userId, username, targetUserId: targetUserIdStr });

  try {
    const room = await RoomService.getRoomById(roomIdStr);
    if (!room) {
      socket.emit("kick_error", { message: "Phòng không tồn tại" });
      return;
    }

    // Kiểm tra quyền: chỉ chủ phòng mới có thể kick
    const isHost = room.hostId?.toString() === userId.toString();
    if (!isHost) {
      socket.emit("kick_error", { message: "Chỉ chủ phòng mới có thể đuổi người chơi" });
      return;
    }

    // Không thể kick chính mình
    if (userId.toString() === targetUserIdStr) {
      socket.emit("kick_error", { message: "Bạn không thể đuổi chính mình" });
      return;
    }

    // Tìm player bị kick
    const targetPlayer = room.players.find(p => p.userId?.toString() === targetUserIdStr);
    if (!targetPlayer) {
      socket.emit("kick_error", { message: "Không tìm thấy người chơi trong phòng" });
      return;
    }

    const targetNickname = targetPlayer.nickname || targetPlayer.username || "Người chơi";

    // Nếu đang chơi, kết thúc game trước
    if (room.status === "playing") {
      log("Chủ phòng đuổi người chơi khi đang chơi - tự động kết thúc game", { 
        roomId: roomIdStr, 
        userId, 
        targetUserId: targetUserIdStr 
      });
      
      // Người chơi còn lại (chủ phòng) thắng
      const gameResult = {
        winner: userId,
        winnerUsername: username,
        winnerNickname: nickname,
        loser: targetUserId,
        loserUsername: targetPlayer.username,
        loserNickname: targetNickname,
        message: `${targetNickname} đã bị đuổi khỏi phòng. ${nickname} thắng!`,
        isKicked: true
      };

      // Kết thúc game
      await RoomService.endGame({ 
        roomId: roomIdStr, 
        result: gameResult 
      });

      // Cập nhật gameStats - tách riêng để đảm bảo cả 2 đều được cập nhật
      const winnerUserId = userId ? userId.toString() : null;
      const loserUserId = targetUserId ? targetUserId.toString() : null;
      
      log("Kick player - winner and loser", { 
        winnerId: winnerUserId, 
        winnerUsername: username,
        loserId: loserUserId, 
        loserUsername: targetPlayer?.username
      });
      
      // Bỏ qua bot khi cập nhật stats
      const BotService = require("../../services/bot.service");
      if (winnerUserId && !BotService.isBot(winnerUserId)) {
        try {
          await UserService.updateGameStats(winnerUserId, "caro", true, false);
          log("Winner stats updated successfully (kick player)");
        } catch (statsError) {
          log("updateGameStats error for winner when kicking player", statsError.message);
        }
      }
      if (loserUserId && !BotService.isBot(loserUserId)) {
        try {
          await UserService.updateGameStats(loserUserId, "caro", false, false);
          log("Loser stats updated successfully (kick player)");
        } catch (statsError) {
          log("updateGameStats error for loser when kicking player", statsError.message);
        }
      }

      // Lấy game state nếu có
      const game = getGameState(roomIdStr);
      const roomAfterEnd = await RoomService.getRoomById(roomIdStr);

      // Thông báo game_end cho tất cả user trong phòng
      io.to(roomIdStr).emit("game_end", {
        result: gameResult,
        board: game?.board || null,
        message: `${targetNickname} đã bị đuổi khỏi phòng. ${nickname} thắng!`,
        timestamp: new Date().toISOString()
      });

      // Cập nhật trạng thái phòng
      io.to(roomIdStr).emit("room_update", {
        room: roomAfterEnd,
        message: "Game đã kết thúc",
        timestamp: new Date().toISOString()
      });

      // Cleanup ping tracking cho tất cả players
      cleanupAllPingTracking(roomIdStr);

      // Giải phóng lock khi xóa game state
      cleanupMoveLock(roomIdStr);

      // Xóa game state
      if (game && roomGames[roomIdStr]) {
        delete roomGames[roomIdStr];
      }

      log("Game ended - player kicked", { roomId: roomIdStr, winner: username, kicked: targetPlayer.username });
    }

    // Xóa player khỏi phòng
    const roomAfter = await RoomService.leaveRoom({ roomId: roomIdStr, userId: targetUserId });

    // Tìm socket của player bị kick để thông báo
    let targetSocket = null;
    for (const [socketId, socketRoomId] of socketToRoom.entries()) {
      if (socketRoomId === roomIdStr) {
        const s = io.sockets.sockets.get(socketId);
        if (s && s.user?._id?.toString() === targetUserIdStr) {
          targetSocket = s;
          break;
        }
      }
    }

    // Xóa socket mapping nếu tìm thấy
    if (targetSocket) {
      socketToRoom.delete(targetSocket.id);
      targetSocket.leave(roomIdStr);
      cleanupPingTracking(roomIdStr, targetUserIdStr);
    }

    // Cập nhật status = 'online' cho player bị kick
    try {
      await UserService.updateUserStatus(targetUserIdStr, "online");
    } catch (statusError) {
      log("Error updating user status to online when kicking", statusError.message);
    }

    // Thông báo cho player bị kick
    if (targetSocket) {
      targetSocket.emit("player_kicked", {
        roomId: roomIdStr,
        message: `Bạn đã bị đuổi khỏi phòng bởi chủ phòng`,
        timestamp: new Date().toISOString()
      });
    }

    // Thông báo cho chủ phòng (người kick)
    socket.emit("kick_success", {
      message: `Đã đuổi ${targetNickname} ra khỏi phòng`,
      timestamp: new Date().toISOString()
    });

    if (roomAfter) {
      // Thông báo cho các user khác trong phòng
      io.to(roomIdStr).emit("player_left", {
        userId: targetUserId,
        username: targetPlayer.username,
        nickname: targetNickname,
        room: roomAfter,
        message: `${targetNickname} đã bị đuổi khỏi phòng`,
        timestamp: new Date().toISOString()
      });

      // Cập nhật trạng thái phòng cho tất cả user còn lại
      io.to(roomIdStr).emit("room_update", {
        room: roomAfter,
        message: `${targetNickname} đã bị đuổi khỏi phòng`,
        timestamp: new Date().toISOString()
      });
    } else {
      // Phòng đã bị xóa (không còn ai)
      io.to(roomIdStr).emit("room_deleted", {
        message: "Phòng đã bị xóa vì không còn người chơi",
        timestamp: new Date().toISOString()
      });
      log("Room deleted (empty after kick)", { roomId: roomIdStr });
    }

    log("Player kicked successfully", { roomId: roomIdStr, userId, targetUserId: targetUserIdStr });

  } catch (err) {
    log("kick_player error", err.message);
    socket.emit("kick_error", { message: err.message });
  }
}

module.exports = {
  handleKickPlayer
};
