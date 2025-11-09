// start.js
// Xử lý bắt đầu game (start_game)

const RoomService = require("../../services/room.service");
const UserService = require("../../services/user.service");
const { initGameForRoom } = require("../game");
const { startTurnTimer } = require("../game/timer");
const { log } = require("./helpers");
const { startPingTimeout } = require("./ping");

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
    if (room.players.length < 2) {
      socket.emit("start_error", { message: "Cần ít nhất 2 người chơi để bắt đầu" });
      return;
    }

    // Kiểm tra tất cả người chơi (trừ chủ phòng) đã sẵn sàng chưa
    const nonHostPlayers = room.players.filter(p => !p.isHost && !p.isDisconnected);
    const allNonHostReady = nonHostPlayers.length > 0 && nonHostPlayers.every(p => p.isReady);
    
    if (!allNonHostReady) {
      socket.emit("start_error", { message: "Tất cả người chơi (trừ chủ phòng) phải sẵn sàng trước khi bắt đầu" });
      return;
    }

    const roomAfter = await RoomService.updateRoom(roomIdStr, { status: "playing" });

    // Khởi tạo game state (async vì cần lưu playerMarks vào DB)
    const gameState = await initGameForRoom(roomIdStr, roomAfter.players);

    // Khởi tạo ping tracking cho tất cả players trong phòng
    if (!roomPlayerPings.has(roomIdStr)) {
      roomPlayerPings.set(roomIdStr, new Map());
    }
    const pingMap = roomPlayerPings.get(roomIdStr);
    const now = Date.now();
    roomAfter.players.forEach(player => {
      if (player.userId) {
        pingMap.set(player.userId.toString(), now);
        // Bắt đầu timeout cho mỗi player (30 giây)
        startPingTimeout(io, roomIdStr, player.userId.toString(), player.username);
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

    // 1️⃣ Thông báo cho tất cả user trong phòng về việc game bắt đầu
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

    // 2️⃣ Cập nhật trạng thái phòng cho tất cả user
    io.to(roomIdStr).emit("room_update", {
      room: roomAfter,
      message: "Game đã bắt đầu",
      timestamp: new Date().toISOString()
    });

    // 3️⃣ Cập nhật status = 'in_game' cho tất cả players
    try {
      roomAfter.players.forEach(async (player) => {
        if (player.userId) {
          await UserService.updateUserStatus(player.userId.toString(), "in_game");
        }
      });
    } catch (statusError) {
      log("Lỗi khi cập nhật trạng thái player thành in_game", statusError.message);
    }

    log("Game đã được bắt đầu bởi chủ phòng", { roomId: roomIdStr, userId, username });

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
