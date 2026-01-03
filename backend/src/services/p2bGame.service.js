// p2bGame.service.js
// Logic game Player vs Bot

const RoomService = require("./room.service");
const BotService = require("./bot.service");
const botMoveService = require("./botMove.service");
const { getGameState } = require("../sockets/game/state");
const { log } = require("../sockets/game/helpers");

/**
 * Kiểm tra xem phòng có phải là P2B không
 */
function isP2BRoom(room) {
  return room && room.mode === 'P2B';
}

/**
 * Lấy bot player từ room
 */
function getBotPlayerFromRoom(room) {
  if (!isP2BRoom(room)) return null;
  return BotService.findFirstBotPlayer(room.players);
}

/**
 * Lấy human player từ room (không phải bot)
 */
function getHumanPlayerFromRoom(room) {
  if (!isP2BRoom(room)) return null;
  return BotService.findFirstHumanPlayer(room.players);
}

/**
 * Tính toán nước đi cho bot trong P2B game
 */
function calculateBotMoveForP2B(room, gameState) {
  if (!isP2BRoom(room)) {
    throw new Error("Room không phải là P2B mode");
  }

  const botMark = BotService.getBotMark(room);
  const difficulty = BotService.getBotDifficulty(room);
  
  if (!botMark) {
    throw new Error("Bot mark không tồn tại");
  }

  // Lấy nước đi cuối cùng để tối ưu hóa tính toán
  const lastMove = gameState.history && gameState.history.length > 0 
    ? { x: gameState.history[gameState.history.length - 1].x, y: gameState.history[gameState.history.length - 1].y }
    : null;

  // Copy board
  const boardCopy = gameState.board.map(row => [...row]);

  // Tính toán nước đi tốt nhất cho bot sử dụng hàm calculateBotMove mới
  return botMoveService.calculateBotMove(boardCopy, botMark, difficulty, lastMove);
}

/**
 * Kiểm tra xem có phải lượt bot trong P2B game không
 */
function isBotTurnInP2B(room, gameState) {
  if (!isP2BRoom(room)) return false;
  
  const currentPlayer = room.players[gameState.currentPlayerIndex];
  if (!currentPlayer) return false;
  
  return BotService.isBotPlayer(currentPlayer);
}

/**
 * Xử lý khi game P2B kết thúc
 */
async function handleP2BGameEnd(roomId, gameResult) {
  const room = await RoomService.getRoomById(roomId);
  if (!isP2BRoom(room)) {
    throw new Error("Room không phải là P2B mode");
  }

  // P2B game end logic (có thể khác với P2P)
  // Ví dụ: không cần cập nhật stats cho bot, chỉ cho human player
  
  return room;
}

/**
 * Xử lý khi player rời phòng P2B
 */
async function handleP2BPlayerLeave(roomId, userId) {
  const room = await RoomService.getRoomById(roomId);
  if (!isP2BRoom(room)) {
    return null; // Không phải P2B, xử lý bình thường
  }

  // P2B: Nếu human player rời, xóa luôn phòng
  if (BotService.isBot(userId)) {
    // Bot rời (không nên xảy ra, nhưng nếu có thì xử lý bình thường)
    return null;
  }

  // Human player rời P2B room -> xóa phòng
  await RoomService.leaveRoom({ roomId, userId });
  return null;
}

/**
 * Kiểm tra điều kiện bắt đầu game P2B
 */
function canStartP2BGame(room) {
  if (!isP2BRoom(room)) return false;
  
  // P2B chỉ cần 1 human player (host)
  const humanPlayers = BotService.filterHumanPlayers(room.players);
  return humanPlayers.length >= 1;
}

/**
 * Kiểm tra điều kiện bắt đầu game P2P
 */
function canStartP2PGame(room) {
  if (isP2BRoom(room)) return false;
  
  // P2P cần ít nhất 2 human players
  return room.players.length >= 2;
}

module.exports = {
  isP2BRoom,
  getBotPlayerFromRoom,
  getHumanPlayerFromRoom,
  calculateBotMoveForP2B,
  isBotTurnInP2B,
  handleP2BGameEnd,
  handleP2BPlayerLeave,
  canStartP2BGame,
  canStartP2PGame,
};

