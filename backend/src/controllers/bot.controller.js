// bot.controller.js
// Xử lý request bot
const response = require("../utils/response");
const botMoveService = require("../services/botMove.service");
const logger = require("../utils/logger");

// Tính toán và trả về nước đi tốt nhất cho bot dựa trên bàn cờ hiện tại và độ khó
async function getBotMove(req, res) {
  try {
    const { board, botMark, difficulty = 'medium', lastMove } = req.body;

    if (!board || !botMark) {
      return response.error(res, "Board and botMark are required", 400);
    }

    // Validate board
    if (!Array.isArray(board) || board.length === 0) {
      return response.error(res, "Board phải là mảng 2D hợp lệ", 400);
    }

    // Validate botMark
    if (botMark !== 'X' && botMark !== 'O') {
      return response.error(res, "botMark phải là 'X' hoặc 'O'", 400);
    }

    // Validate difficulty
    if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
      return response.error(res, "difficulty phải là 'easy', 'medium' hoặc 'hard'", 400);
    }

    // Tính toán nước đi
    const move = botMoveService.calculateBotMove(board, botMark, difficulty, lastMove);

    if (!move || move.x === undefined || move.y === undefined) {
      return response.error(res, "Không thể tính toán nước đi", 500);
    }

    return response.success(res, { 
      x: move.x, 
      y: move.y,
      score: move.score,
      info: move.info,
      difficulty 
    }, "Bot move generated");
  } catch (err) {
    logger.error(`Lỗi khi tính nước đi bot: ${err.message}`);
    logger.error(`Stack: ${err.stack}`);
    return response.error(res, err.message || "Lỗi khi tính nước đi bot", 500);
  }
}

module.exports = {
  getBotMove,
};

