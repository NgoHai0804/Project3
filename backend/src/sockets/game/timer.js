// timer.js
// Xử lý turn timer cho game

const RoomService = require("../../services/room.service");
const UserService = require("../../services/user.service");
const { getGameState } = require("./state");
const { log, updatePlayersStatusToOnline } = require("./helpers");

/** Map để theo dõi turn timer cho mỗi phòng */
// Format: roomId -> timeout
const roomTurnTimers = new Map();

/** ----------------- START TURN TIMER ----------------- */
function startTurnTimer(io, roomIdStr, turnTimeLimit) {
  // Xóa timer cũ nếu có
  const existingTimer = roomTurnTimers.get(roomIdStr);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  // Tạo timer mới để đếm ngược
  const timer = setTimeout(async () => {
    try {
      const room = await RoomService.getRoomById(roomIdStr);
      if (!room || room.status !== "playing") {
        roomTurnTimers.delete(roomIdStr);
        return;
      }

      const game = getGameState(roomIdStr);
      if (!game) {
        roomTurnTimers.delete(roomIdStr);
        return;
      }

      // Tìm người chơi đang đến lượt (người bị hết thời gian)
      const currentPlayer = room.players[game.currentPlayerIndex];
      if (!currentPlayer) {
        roomTurnTimers.delete(roomIdStr);
        return;
      }

      // Tìm người chơi còn lại (người sẽ thắng do đối thủ hết thời gian)
      const winner = room.players.find(p => p.userId.toString() !== currentPlayer.userId.toString());
      const winnerNickname = winner?.nickname || winner?.username || "Đối thủ";
      const loserNickname = currentPlayer?.nickname || currentPlayer?.username || "Người chơi";

      // Tạo kết quả game: người chơi hết thời gian nên thua
      const gameResult = {
        winner: winner?.userId || null,
        winnerUsername: winner?.username || "Đối thủ",
        winnerNickname: winnerNickname,
        loser: currentPlayer.userId,
        loserUsername: currentPlayer.username,
        loserNickname: loserNickname,
        message: `${loserNickname} đã hết thời gian. ${winnerNickname} thắng!`,
        isTimeout: true,
        isTurnTimeout: true
      };

      await RoomService.endGame({ 
        roomId: roomIdStr, 
        result: gameResult 
      });

      // Cập nhật thống kê game cho cả người thắng và người thua
      // Bỏ qua bot khi cập nhật stats
      const BotService = require("../../services/bot.service");
      const winnerUserId = winner?.userId ? winner.userId.toString() : null;
      const loserUserId = currentPlayer.userId ? currentPlayer.userId.toString() : null;
      
      log("Turn timeout - winner and loser", { 
        winnerId: winnerUserId, 
        winnerUsername: winner?.username,
        loserId: loserUserId, 
        loserUsername: currentPlayer?.username
      });
      
      if (winnerUserId && !BotService.isBot(winnerUserId)) {
        try {
          await UserService.updateGameStats(winnerUserId, "caro", true, false);
          log("Winner stats updated successfully (turn timeout)");
        } catch (statsError) {
          log("updateGameStats error for winner on turn timeout", statsError.message);
        }
      }
      if (loserUserId && !BotService.isBot(loserUserId)) {
        try {
          await UserService.updateGameStats(loserUserId, "caro", false, false);
          log("Loser stats updated successfully (turn timeout)");
        } catch (statsError) {
          log("updateGameStats error for loser on turn timeout", statsError.message);
        }
      }

      // Gửi thông báo game đã kết thúc cho tất cả người chơi trong phòng
      io.to(roomIdStr).emit("game_end", {
        result: gameResult,
        board: game.board,
        message: gameResult.message,
        timestamp: new Date().toISOString()
      });

      const roomAfter = await RoomService.getRoomById(roomIdStr);
      io.to(roomIdStr).emit("room_update", {
        room: roomAfter,
        message: "Game đã kết thúc",
        timestamp: new Date().toISOString()
      });

      // Cập nhật trạng thái thành 'online' cho tất cả người chơi
      await updatePlayersStatusToOnline(roomIdStr);

      // Dọn dẹp: xóa ping tracking và timer
      const { cleanupAllPingTracking } = require("../room");
      cleanupAllPingTracking(roomIdStr);
      roomTurnTimers.delete(roomIdStr);

      log("Game ended - turn timeout", { roomId: roomIdStr, loser: currentPlayer.userId });
    } catch (err) {
      log("Lỗi turn timer", err.message);
      roomTurnTimers.delete(roomIdStr);
    }
  }, turnTimeLimit * 1000); // Convert to milliseconds

  roomTurnTimers.set(roomIdStr, timer);
  return timer;
}

/** Dừng timer đếm ngược thời gian lượt chơi */
function stopTurnTimer(roomIdStr) {
  const timer = roomTurnTimers.get(roomIdStr);
  if (timer) {
    clearTimeout(timer);
    roomTurnTimers.delete(roomIdStr);
  }
}

module.exports = {
  startTurnTimer,
  stopTurnTimer
};
