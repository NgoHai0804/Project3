// draw.js
// Xử lý yêu cầu xin hòa (request_draw, cancel_draw, respond_draw)

const RoomService = require("../../services/room.service");
const UserService = require("../../services/user.service");
const GameCaroService = require("../../services/gameCaro.service");
const { getGameState, roomGames } = require("./state");
const { log, updatePlayersStatusToOnline } = require("./helpers");

/** Lưu trữ các yêu cầu xin hòa đang chờ: roomId -> { requesterId, timestamp } */
const pendingDrawRequests = {};

/** ----------------- REQUEST DRAW (Xin hòa) ----------------- */
async function handleRequestDraw(io, socket, data) {
  const { roomId } = data;
  const userId = socket.user._id;
  const username = socket.user.username;
  const nickname = socket.user.nickname || socket.user.username;
  const roomIdStr = roomId.toString();

  log("request_draw", { roomId: roomIdStr, userId, username });

  try {
    const room = await RoomService.getRoomById(roomIdStr);
    if (!room) {
      socket.emit("draw_error", { message: "Phòng không tồn tại" });
      return;
    }

    if (room.status !== "playing") {
      socket.emit("draw_error", { message: "Game chưa bắt đầu hoặc đã kết thúc" });
      return;
    }

    const player = room.players.find(p => p.userId.toString() === userId.toString());
    if (!player) {
      socket.emit("draw_error", { message: "Bạn không ở trong phòng này" });
      return;
    }

    // Tìm người chơi còn lại
    const opponent = room.players.find(p => p.userId.toString() !== userId.toString());
    if (!opponent) {
      socket.emit("draw_error", { message: "Không tìm thấy đối thủ" });
      return;
    }

    // Lưu yêu cầu xin hòa
    pendingDrawRequests[roomIdStr] = {
      requesterId: userId,
      requesterUsername: username,
      requesterNickname: nickname,
      timestamp: new Date().toISOString()
    };

    // Thông báo cho tất cả người chơi trong phòng
    // Frontend sẽ xử lý logic: nếu là người gửi thì hiển thị thông báo, nếu là đối thủ thì hiển thị dialog xác nhận
    io.to(roomIdStr).emit("draw_requested", {
      requesterId: userId,
      requesterUsername: username,
      requesterNickname: nickname,
      message: `${nickname} muốn xin hòa`,
      timestamp: new Date().toISOString()
    });

    log("Draw request sent", { roomId: roomIdStr, requester: username });

  } catch (err) {
    log("request_draw error", err.message);
    socket.emit("draw_error", { message: err.message });
  }
}

/** ----------------- CANCEL DRAW (Hủy yêu cầu xin hòa) ----------------- */
async function handleCancelDraw(io, socket, data) {
  const { roomId } = data;
  const userId = socket.user._id;
  const username = socket.user.username;
  const nickname = socket.user.nickname || socket.user.username;
  const roomIdStr = roomId.toString();

  log("cancel_draw", { roomId: roomIdStr, userId, username, nickname });

  try {
    const room = await RoomService.getRoomById(roomIdStr);
    if (!room) {
      socket.emit("draw_error", { message: "Phòng không tồn tại" });
      return;
    }

    const drawRequest = pendingDrawRequests[roomIdStr];
    if (!drawRequest) {
      socket.emit("draw_error", { message: "Không có yêu cầu xin hòa nào đang chờ" });
      return;
    }

    // Chỉ người gửi yêu cầu mới có thể hủy
    if (drawRequest.requesterId.toString() !== userId.toString()) {
      socket.emit("draw_error", { message: "Bạn không thể hủy yêu cầu của người khác" });
      return;
    }

    // Xóa yêu cầu đang chờ
    delete pendingDrawRequests[roomIdStr];

    // Thông báo cho tất cả người chơi trong phòng
    io.to(roomIdStr).emit("draw_cancelled", {
      requesterId: userId,
      requesterUsername: username,
      requesterNickname: nickname,
      message: `${nickname} đã hủy yêu cầu xin hòa`,
      timestamp: new Date().toISOString()
    });

    log("Draw request cancelled", { roomId: roomIdStr, requester: username });

  } catch (err) {
    log("cancel_draw error", err.message);
    socket.emit("draw_error", { message: err.message });
  }
}

/** ----------------- ACCEPT/REJECT DRAW ----------------- */
async function handleRespondDraw(io, socket, data) {
  const { roomId, accept } = data;
  const userId = socket.user._id;
  const username = socket.user.username;
  const nickname = socket.user.nickname || socket.user.username;
  const roomIdStr = roomId.toString();

  log("respond_draw", { roomId: roomIdStr, userId, username, accept });

  try {
    const room = await RoomService.getRoomById(roomIdStr);
    if (!room) {
      socket.emit("draw_error", { message: "Phòng không tồn tại" });
      return;
    }

    if (room.status !== "playing") {
      socket.emit("draw_error", { message: "Game chưa bắt đầu hoặc đã kết thúc" });
      return;
    }

    const drawRequest = pendingDrawRequests[roomIdStr];
    if (!drawRequest) {
      socket.emit("draw_error", { message: "Không có yêu cầu xin hòa nào đang chờ" });
      return;
    }

    // Kiểm tra người phản hồi không phải là người gửi yêu cầu
    if (drawRequest.requesterId.toString() === userId.toString()) {
      socket.emit("draw_error", { message: "Bạn không thể phản hồi yêu cầu của chính mình" });
      return;
    }

    // Xóa yêu cầu đang chờ
    delete pendingDrawRequests[roomIdStr];

    if (accept) {
      // Chấp nhận hòa
      const gameResult = {
        winner: null,
        message: "Hòa! (Cả hai người chơi đồng ý)"
      };

      await RoomService.endGame({ 
        roomId: roomIdStr, 
        result: gameResult 
      });

      // Cập nhật gameStats cho cả 2 người chơi (hòa) - tách riêng để đảm bảo cả 2 đều được cập nhật
      // Bỏ qua bot khi cập nhật stats
      const BotService = require("../../services/bot.service");
      for (const player of room.players) {
        if (player.userId && !BotService.isBot(player.userId)) {
          try {
            log("Updating player stats (draw accepted)", { playerId: player.userId.toString() });
            await UserService.updateGameStats(player.userId, "caro", false, true);
            log("Player stats updated successfully (draw accepted)", { playerId: player.userId.toString() });
          } catch (statsError) {
            log(`updateGameStats error for player ${player.userId} on draw accepted`, statsError.message);
            log("updateGameStats error stack", statsError.stack);
          }
        }
      }

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
          log("Game history saved successfully (draw accepted)", { roomId: roomIdStr });
        }
      } catch (historyError) {
        log("Error saving game history (draw accepted)", historyError.message);
        // Không throw error để không ảnh hưởng đến flow chính
      }

      const roomAfter = await RoomService.getRoomById(roomIdStr);

      // Thông báo cho tất cả user trong phòng
      io.to(roomIdStr).emit("draw_accepted", {
        message: `${nickname} đã chấp nhận xin hòa. Game kết thúc hòa!`,
        timestamp: new Date().toISOString()
      });

      io.to(roomIdStr).emit("game_end", {
        result: gameResult,
        board: game?.board || null,
        message: "Hòa! (Cả hai người chơi đồng ý)",
        timestamp: new Date().toISOString()
      });

      io.to(roomIdStr).emit("room_update", {
        room: roomAfter,
        message: "Game đã kết thúc (Hòa)",
        timestamp: new Date().toISOString()
      });

      // Cập nhật status = 'online' cho tất cả players
      await updatePlayersStatusToOnline(roomIdStr);

      // Xóa game state
      if (game) {
        delete roomGames[roomIdStr];
      }

      log("Draw accepted", { roomId: roomIdStr });
    } else {
      // Từ chối hòa
      io.to(roomIdStr).emit("draw_rejected", {
        rejectorId: userId,
        rejectorUsername: username,
        rejectorNickname: nickname,
        message: `${nickname} đã từ chối xin hòa`,
        timestamp: new Date().toISOString()
      });

      log("Draw rejected", { roomId: roomIdStr, rejector: username });
    }

  } catch (err) {
    log("respond_draw error", err.message);
    socket.emit("draw_error", { message: err.message });
  }
}

module.exports = {
  handleRequestDraw,
  handleCancelDraw,
  handleRespondDraw
};
