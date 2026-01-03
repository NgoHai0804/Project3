// start.js
// Xử lý bắt đầu game (start_game)

const RoomService = require("../../services/room.service");
const UserService = require("../../services/user.service");
const { initGameForRoom } = require("../game");
const { startTurnTimer } = require("../game/timer");
const { log } = require("./helpers");
const { startPingTimeout } = require("./ping");
const { isCurrentPlayerBot, triggerBotMoveIfNeeded } = require("../game/bot");
const BotService = require("../../services/bot.service");

/** Map theo dõi thời gian ping cuối cùng của mỗi người chơi trong phòng đang chơi */
// Format: roomId -> { userId -> lastPingTime }
const roomPlayerPings = require("./ping").roomPlayerPings;

/** Xử lý khi chủ phòng bắt đầu game (chỉ chủ phòng mới có quyền) */
async function handleStartGame(io, socket, data) {
  const { roomId } = data;
  const userId = socket.user._id;
  const username = socket.user.username;
  const nickname = socket.user.nickname || socket.user.username;
  const roomIdStr = roomId.toString();

  log("start_game được gọi", { roomId: roomIdStr, userId, username, nickname });

  try {
    const room = await RoomService.getRoomById(roomIdStr);
    if (!room) {
      socket.emit("start_error", { message: "Phòng không tồn tại" });
      return;
    }
    if (room.hostId?.toString() !== userId.toString()) {
      socket.emit("start_error", { message: "Chỉ chủ phòng mới có thể bắt đầu game" });
      return;
    }
    if (room.status === "playing") {
      socket.emit("start_error", { message: "Game đã bắt đầu rồi" });
      return;
    }
    // Tách biệt logic P2B và P2P
    const P2BGameService = require("../../services/p2bGame.service");
    const isBotRoom = P2BGameService.isP2BRoom(room);
    
    // Kiểm tra điều kiện bắt đầu game
    if (isBotRoom) {
      // P2B: Chỉ cần 1 human player
      if (!P2BGameService.canStartP2BGame(room)) {
        socket.emit("start_error", { message: "Cần ít nhất 1 người chơi để bắt đầu với bot" });
        return;
      }
    } else {
      // P2P: Cần ít nhất 2 players
      if (!P2BGameService.canStartP2PGame(room)) {
        socket.emit("start_error", { message: "Cần ít nhất 2 người chơi để bắt đầu" });
        return;
      }
      
      // P2P: Kiểm tra tất cả người chơi (trừ chủ phòng) đã sẵn sàng chưa
      const nonHostPlayers = room.players.filter(p => !p.isHost && !p.isDisconnected);
      const allNonHostReady = nonHostPlayers.length === 0 || nonHostPlayers.every(p => p.isReady);
      
      if (!allNonHostReady) {
        socket.emit("start_error", { message: "Tất cả người chơi (trừ chủ phòng) phải sẵn sàng trước khi bắt đầu" });
        return;
      }
    }

    const roomAfter = await RoomService.updateRoom(roomIdStr, { status: "playing" });

    // Khởi tạo game state (async vì cần lưu playerMarks vào DB)
    const gameState = await initGameForRoom(roomIdStr, roomAfter.players);

    // Init ping tracking
    if (!roomPlayerPings.has(roomIdStr)) {
      roomPlayerPings.set(roomIdStr, new Map());
    }
    const pingMap = roomPlayerPings.get(roomIdStr);
    const now = Date.now();
    roomAfter.players.forEach(player => {
      if (player.userId) {
        const playerIdStr = player.userId.toString();
        // Bỏ qua bot - bot không cần ping tracking
        if (!BotService.isBot(playerIdStr)) {
          pingMap.set(playerIdStr, now);
          // Bắt đầu timeout cho mỗi player (30 giây) - chỉ cho human players
          startPingTimeout(io, roomIdStr, playerIdStr, player.username);
        }
      }
    });

    // Bắt đầu timer cho lượt đầu tiên
    const turnTimeLimit = roomAfter.turnTimeLimit || 30;
    try {
      if (startTurnTimer && typeof startTurnTimer === 'function') {
        startTurnTimer(io, roomIdStr, turnTimeLimit);
      } else {
        log("Cảnh báo: startTurnTimer không khả dụng", { roomId: roomIdStr });
      }
    } catch (timerError) {
      log("Lỗi khi bắt đầu turn timer", timerError.message);
      // Không throw error, chỉ log để game vẫn có thể bắt đầu
    }

    // Convert playerMarks Map to Object for JSON
    const playerMarksObj = roomAfter.playerMarks 
      ? (roomAfter.playerMarks instanceof Map 
          ? Object.fromEntries(roomAfter.playerMarks) 
          : roomAfter.playerMarks)
      : {};

    // 1Thông báo cho tất cả user trong phòng về việc game bắt đầu
    io.to(roomIdStr).emit("game_start", { 
      players: roomAfter.players,
      room: roomAfter,
      board: gameState.board,
      turn: gameState.turn,
      currentPlayerIndex: gameState.currentPlayerIndex,
      history: gameState.history || [],
      playerMarks: playerMarksObj,
      turnTimeLimit: turnTimeLimit,
      turnStartTime: gameState.turnStartTime, // Gửi turnStartTime để client đồng bộ timer
      firstTurn: roomAfter.firstTurn || 'X',
      message: `${nickname} (chủ phòng) đã bắt đầu game!`,
      timestamp: new Date().toISOString()
    });

    // 2Cập nhật trạng thái phòng cho tất cả user
    io.to(roomIdStr).emit("room_update", {
      room: roomAfter,
      message: "Game đã bắt đầu",
      timestamp: new Date().toISOString()
    });

    // Cập nhật status = 'in_game' cho tất cả players (chỉ human players)
    try {
      roomAfter.players.forEach(async (player) => {
        if (player.userId && !BotService.isBot(player.userId)) {
          await UserService.updateUserStatus(player.userId.toString(), "in_game");
        }
      });
    } catch (statusError) {
      log("Lỗi khi cập nhật trạng thái player thành in_game", statusError.message);
    }

    log("Game đã được bắt đầu bởi chủ phòng", { roomId: roomIdStr, userId, username });
    
    // Nếu là bot room và bot đi trước, trigger bot move
    if (isBotRoom) {
      setTimeout(async () => {
        try {
          const isBotTurn = await isCurrentPlayerBot(roomIdStr);
          if (isBotTurn) {
            log("Bot goes first, triggering bot move", { roomId: roomIdStr });
            await triggerBotMoveIfNeeded(io, roomIdStr);
          }
        } catch (botError) {
          log("Error triggering initial bot move", botError.message);
        }
      }, 500); // Đợi một chút để game state được khởi tạo hoàn toàn
    }

  } catch (err) {
    log("Lỗi start_game", err.message);
    log("Stack trace lỗi start_game", err.stack);
    socket.emit("start_error", { 
      message: err.message || "Có lỗi xảy ra khi bắt đầu game",
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}

module.exports = {
  handleStartGame
};
