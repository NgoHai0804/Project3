// index.js
// Main game socket handler - tổng hợp tất cả các handlers

const { getGameState, initGameForRoom } = require("./state");
const { socketToRoom } = require("../room/join");
const { startTurnTimer, stopTurnTimer } = require("./timer");
const { handleMakeMove, handleUndoMove, handleResetGame, cleanupMoveLock } = require("./move");
const { handleRequestDraw, handleCancelDraw, handleRespondDraw } = require("./draw");
const { handleSurrender } = require("./surrender");
const { log } = require("./helpers");
const RoomService = require("../../services/room.service");

/** ----------------- GET GAME STATE ----------------- */
async function handleGetGameState(io, socket, data) {
  const { roomId } = data;
  const roomIdStr = roomId.toString();

  try {
    const room = await RoomService.getRoomById(roomIdStr);
    if (!room) {
      socket.emit("game_state_error", { message: "Phòng không tồn tại" });
      return;
    }

    const game = getGameState(roomIdStr);
    const turnTimeLimit = room.turnTimeLimit || 30;
    
    // Trả về đầy đủ thông tin game state để client có thể khôi phục hoàn toàn
    socket.emit("game_state", {
      board: game.board,
      turn: game.turn,
      history: game.history,
      currentPlayer: room.players[game.currentPlayerIndex],
      currentPlayerIndex: game.currentPlayerIndex,
      players: room.players,
      room: room,
      turnStartTime: game.turnStartTime || Date.now(), // Thời gian bắt đầu lượt hiện tại
      turnTimeLimit: turnTimeLimit, // Thời gian giới hạn mỗi lượt
      timestamp: new Date().toISOString()
    });

    log("Game state sent", { 
      roomId: roomIdStr, 
      movesCount: game.history?.length || 0,
      currentPlayerIndex: game.currentPlayerIndex,
      turn: game.turn
    });

  } catch (err) {
    log("get_game_state error", err.message);
    socket.emit("game_state_error", { message: err.message });
  }
}

/** ----------------- DISCONNECT ----------------- */
async function handleDisconnect(io, socket) {
  const roomIdStr = socketToRoom.get(socket.id);
  if (roomIdStr) {
    socketToRoom.delete(socket.id);
    // Không xóa game state khi disconnect, để có thể reconnect
  }
}

/** ----------------- EXPORT MODULE ----------------- */
function gameSocket(io, socket) {
  // Không cần game:init event nữa vì socketToRoom được quản lý trực tiếp bởi room socket handlers
  // socketToRoom được cập nhật khi join_room được gọi (trong room/join.js)

  socket.on("make_move", (data) => handleMakeMove(io, socket, data));
  socket.on("undo_move", (data) => handleUndoMove(io, socket, data));
  socket.on("reset_game", (data) => handleResetGame(io, socket, data));
  socket.on("request_draw", (data) => handleRequestDraw(io, socket, data));
  socket.on("cancel_draw", (data) => handleCancelDraw(io, socket, data));
  socket.on("respond_draw", (data) => handleRespondDraw(io, socket, data));
  socket.on("get_game_state", (data) => handleGetGameState(io, socket, data));
  socket.on("surrender_game", (data) => handleSurrender(io, socket, data));
}

// Export main function và helper functions
module.exports = gameSocket;
module.exports.getGameState = getGameState;
module.exports.initGameForRoom = initGameForRoom;
module.exports.startTurnTimer = startTurnTimer;
module.exports.stopTurnTimer = stopTurnTimer;
module.exports.cleanupMoveLock = cleanupMoveLock;
module.exports.roomGames = require("./state").roomGames;
