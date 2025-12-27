// surrender.js
// Xử lý đầu hàng (surrender_game)

const RoomService = require("../../services/room.service");
const UserService = require("../../services/user.service");
const GameCaroService = require("../../services/gameCaro.service");
const { getGameState, roomGames } = require("./state");
const { stopTurnTimer } = require("./timer");
const { log, updatePlayersStatusToOnline } = require("./helpers");

/** ----------------- SURRENDER GAME ----------------- */
async function handleSurrender(io, socket, data) {
  const { roomId } = data;
  const userId = socket.user._id;
  const username = socket.user.username;
  const nickname = socket.user.nickname || socket.user.username;
  const roomIdStr = roomId.toString();

  log("surrender_game", { roomId: roomIdStr, userId, username, nickname });

  try {
    const room = await RoomService.getRoomById(roomIdStr);
    if (!room) {
      socket.emit("surrender_error", { message: "Phòng không tồn tại" });
      return;
    }

    if (room.status !== "playing") {
      socket.emit("surrender_error", { message: "Game chưa bắt đầu hoặc đã kết thúc" });
      return;
    }

    const player = room.players.find(p => {
      const playerId = p.userId?.toString ? p.userId.toString() : String(p.userId);
      const currentUserId = userId?.toString ? userId.toString() : String(userId);
      return playerId === currentUserId;
    });
    if (!player) {
      socket.emit("surrender_error", { message: "Bạn không ở trong phòng này" });
      return;
    }

    // Tìm người chơi còn lại (người thắng) TRƯỚC KHI gọi endGame
    // Đảm bảo tìm đúng người chơi khác với người đầu hàng
    const currentUserIdStr = userId?.toString ? userId.toString() : String(userId);
    const winner = room.players.find(p => {
      const playerId = p.userId?.toString ? p.userId.toString() : String(p.userId);
      return playerId !== currentUserIdStr;
    });
    
    if (!winner) {
      log("ERROR: Cannot find winner player", { 
        currentUserId: currentUserIdStr,
        allPlayers: room.players.map(p => ({ 
          userId: p.userId?.toString ? p.userId.toString() : String(p.userId), 
          username: p.username 
        }))
      });
      socket.emit("surrender_error", { message: "Không tìm thấy đối thủ" });
      return;
    }
    
    const winnerNickname = winner?.nickname || winner?.username || "Đối thủ";
    const winnerUserId = winner.userId?.toString ? winner.userId.toString() : String(winner.userId);
    const loserUserId = currentUserIdStr;
    
    log("Surrender - winner and loser", { 
      winnerId: winnerUserId, 
      winnerUsername: winner?.username,
      winnerNickname: winnerNickname,
      loserId: loserUserId, 
      loserUsername: username,
      loserNickname: nickname,
      allPlayers: room.players.map(p => ({ 
        userId: p.userId?.toString ? p.userId.toString() : String(p.userId), 
        username: p.username,
        nickname: p.nickname
      }))
    });
    
    const gameResult = {
      winner: winner.userId,
      winnerUsername: winner?.username || "Đối thủ",
      winnerNickname: winnerNickname,
      loser: userId,
      loserUsername: username,
      loserNickname: nickname,
      message: `${nickname} đã đầu hàng. ${winnerNickname} thắng!`,
      isSurrender: true
    };

    await RoomService.endGame({ 
      roomId: roomIdStr, 
      result: gameResult 
    });

    // Cập nhật gameStats cho người thắng và thua (đầu hàng) - ĐẢM BẢO CẢ 2 ĐỀU ĐƯỢC CẬP NHẬT
    // Bỏ qua bot khi cập nhật stats
    const BotService = require("../../services/bot.service");
    // Cập nhật stats cho người thắng TRƯỚC
    let winnerUpdated = false;
    if (winnerUserId && !BotService.isBot(winnerUserId)) {
      try {
        log("Updating winner stats (surrender)", { winnerId: winnerUserId });
        await UserService.updateGameStats(winnerUserId, "caro", true, false);
        winnerUpdated = true;
        log("Winner stats updated successfully", { winnerId: winnerUserId });
      } catch (statsError) {
        log("updateGameStats error for winner (surrender)", { 
          winnerId: winnerUserId,
          error: statsError.message,
          stack: statsError.stack 
        });
      }
    } else if (winnerUserId) {
      log("Skipping winner stats update (bot)", { winnerId: winnerUserId });
    } else {
      log("ERROR: winnerUserId is null/undefined, cannot update winner stats");
    }
    
    // Cập nhật stats cho người thua (đầu hàng) - LUÔN cập nhật, tách riêng để đảm bảo luôn chạy
    let loserUpdated = false;
    if (loserUserId && !BotService.isBot(loserUserId)) {
      try {
        log("Updating loser stats (surrender)", { loserId: loserUserId });
        await UserService.updateGameStats(loserUserId, "caro", false, false);
        loserUpdated = true;
        log("Loser stats updated successfully", { loserId: loserUserId });
      } catch (statsError) {
        log("updateGameStats error for loser (surrender)", { 
          loserId: loserUserId,
          error: statsError.message,
          stack: statsError.stack 
        });
      }
    } else if (loserUserId) {
      log("Skipping loser stats update (bot)", { loserId: loserUserId });
    } else {
      log("ERROR: loserUserId is null/undefined, cannot update loser stats");
    }
    
    // Log kết quả cuối cùng
    log("Surrender stats update result", { 
      winnerUpdated, 
      loserUpdated, 
      winnerId: winnerUserId, 
      loserId: loserUserId 
    });

    const game = roomGames[roomIdStr];
    
    // Lưu lịch sử chơi vào database
    try {
      if (game) {
        const boardSize = game.board ? game.board.length : 20;
        await GameCaroService.saveGameHistory({
          roomId: roomIdStr,
          gameState: game,
          result: gameResult,
          boardSize: boardSize,
          mode: 'P2P'
        });
        log("Game history saved successfully (surrender)", { roomId: roomIdStr });
      }
    } catch (historyError) {
      log("Error saving game history (surrender)", historyError.message);
      // Không throw error để không ảnh hưởng đến flow chính
    }

    const roomAfter = await RoomService.getRoomById(roomIdStr);

    // Thông báo cho tất cả user trong phòng
    io.to(roomIdStr).emit("game_end", {
      result: gameResult,
      board: game?.board || null,
      message: `${nickname} đã đầu hàng. ${winnerNickname} thắng!`,
      timestamp: new Date().toISOString()
    });

    io.to(roomIdStr).emit("room_update", {
      room: roomAfter,
      message: "Game đã kết thúc",
      timestamp: new Date().toISOString()
    });

    // Cập nhật status = 'online' cho tất cả players
    await updatePlayersStatusToOnline(roomIdStr);

    // Dừng turn timer
    stopTurnTimer(roomIdStr);

    // Cleanup ping tracking cho tất cả players
    const { cleanupAllPingTracking } = require("../room");
    cleanupAllPingTracking(roomIdStr);

    // Xóa game state
    if (game) {
      delete roomGames[roomIdStr];
    }

    log("Game ended - surrender", { roomId: roomIdStr, loser: username });

  } catch (err) {
    log("surrender_game error", err.message);
    socket.emit("surrender_error", { message: err.message });
  }
}

module.exports = {
  handleSurrender
};
