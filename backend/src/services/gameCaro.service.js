// gameCaro.service.js - xử lý logic lịch sử chơi Caro

const GameCaro = require("../models/gameCaro.model");
const Room = require("../models/room.model");
const logger = require("../utils/logger");

// Lưu lịch sử chơi vào database
async function saveGameHistory({ roomId, gameState, result, boardSize = 20, mode = 'P2P' }) {
  try {
    const room = await Room.findById(roomId);
    if (!room) {
      logger.warn(`Không tìm thấy phòng để lưu lịch sử game: ${roomId}`);
      throw new Error("Phòng không tồn tại");
    }

    let playerX = null;
    let playerO = null;
    
    const playerMarksObj = room.playerMarks instanceof Map 
      ? Object.fromEntries(room.playerMarks) 
      : (room.playerMarks || {});

    for (const [userId, mark] of Object.entries(playerMarksObj)) {
      if (mark === 'X') {
        playerX = userId;
      } else if (mark === 'O') {
        playerO = userId;
      }
    }

    if (!playerX || !playerO) {
      if (room.players && room.players.length >= 2) {
        for (const player of room.players) {
          const playerId = player.userId?.toString();
          const mark = playerMarksObj[playerId];
          if (mark === 'X' && !playerX) {
            playerX = player.userId;
          } else if (mark === 'O' && !playerO) {
            playerO = player.userId;
          }
        }
      }
    }

    let winnerId = null;
    if (result && result.winner) {
      winnerId = result.winner;
    }

    const moves = (gameState?.history || []).map((move, index) => ({
      userId: move.userId,
      moveNumber: index + 1,
      pieceType: move.mark,
      x: move.x,
      y: move.y,
      createdAt: move.timestamp ? new Date(move.timestamp) : new Date()
    }));

    let startedAt = new Date();
    if (gameState && gameState.turnStartTime) {
      startedAt = new Date(gameState.turnStartTime);
    } else if (room.createdAt) {
      startedAt = room.createdAt;
    }

    const gameCaro = await GameCaro.create({
      nameRoom: room.name || null,
      roomId: roomId,
      playerX: playerX,
      playerO: playerO,
      winnerId: winnerId,
      boardSize: boardSize,
      startedAt: startedAt,
      endedAt: new Date(),
      mode: mode,
      moves: moves
    });

    logger.info(`Đã lưu lịch sử game: ${gameCaro._id} cho phòng ${roomId}`);
    return gameCaro;
  } catch (err) {
    logger.error("Lỗi khi lưu lịch sử game: %o", err);
    throw err;
  }
}

// Lấy lịch sử chơi của một user
async function getUserGameHistory(userId, options = {}) {
  try {
    const limit = options.limit || 20;
    const skip = options.skip || 0;

    const games = await GameCaro.find({
      $or: [
        { playerX: userId },
        { playerO: userId }
      ]
    })
      .populate('playerX', 'nickname avatarUrl')
      .populate('playerO', 'nickname avatarUrl')
      .populate('winnerId', 'nickname avatarUrl')
      .sort({ endedAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    return games;
  } catch (err) {
    logger.error("Lỗi khi lấy lịch sử game của người dùng: %o", err);
    throw err;
  }
}

// Lấy chi tiết một game theo ID
async function getGameById(gameId) {
  try {
    const game = await GameCaro.findById(gameId)
      .populate('playerX', 'nickname avatarUrl')
      .populate('playerO', 'nickname avatarUrl')
      .populate('winnerId', 'nickname avatarUrl')
      .lean();

    if (!game) {
      throw new Error("Không tìm thấy game");
    }

    return game;
  } catch (err) {
    logger.error("Lỗi khi lấy game theo ID: %o", err);
    throw err;
  }
}

// Lấy số lượng game của một user
async function getUserGameCount(userId) {
  try {
    const count = await GameCaro.countDocuments({
      $or: [
        { playerX: userId },
        { playerO: userId }
      ]
    });
    return count;
  } catch (err) {
    logger.error("Lỗi khi lấy số lượng game của người dùng: %o", err);
    throw err;
  }
}

module.exports = {
  saveGameHistory,
  getUserGameHistory,
  getGameById,
  getUserGameCount
};
