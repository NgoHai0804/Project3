// bot.service.js - xử lý logic liên quan đến Bot

const { v4: uuidv4 } = require("uuid");

// Bot constants - di chuyển ra đây để tránh circular dependency
const BOT_ID = "BOT_CARO_AI";
const BOT_USERNAME = "Bot AI";
const BOT_NICKNAME = "Bot AI";

/**
 * Kiểm tra xem userId có phải là bot không
 */
function isBot(userId, username = null) {
  const userIdStr = userId?.toString();
  return userIdStr === BOT_ID || username === BOT_USERNAME;
}

/**
 * Kiểm tra xem player có phải là bot không
 */
function isBotPlayer(player) {
  if (!player) return false;
  const playerIdStr = player.userId?.toString();
  return playerIdStr === BOT_ID || player.username === BOT_USERNAME;
}

/**
 * Lấy thông tin bot player object
 */
function getBotPlayerObject() {
  return {
    userId: BOT_ID,
    username: BOT_USERNAME,
    isHost: false,
    isReady: true, // Bot luôn sẵn sàng
    sessionId: uuidv4(),
    isDisconnected: false,
  };
}

/**
 * Lấy thông tin bot để hiển thị (nickname, elo, avatarUrl)
 */
function getBotDisplayInfo() {
  return {
    nickname: BOT_NICKNAME,
    elo: null,
    score: null,
    avatarUrl: null,
  };
}

/**
 * Lấy ELO của user (trả về null nếu là bot)
 */
async function getUserElo(userId) {
  const User = require("../models/user.model");
  
  try {
    // Kiểm tra nếu là bot
    if (isBot(userId)) {
      return null; // Bot không có ELO
    }
    
    const user = await User.findById(userId);
    if (!user || !user.gameStats || user.gameStats.length === 0) {
      return 1000; // Điểm ELO mặc định
    }
    const caroStats = user.gameStats.find(s => s.gameId === 'caro') || user.gameStats[0];
    return caroStats?.score || 1000;
  } catch (error) {
    console.error('Lỗi khi lấy điểm ELO của người dùng:', error);
    return 1000; // Điểm ELO mặc định khi có lỗi
  }
}

/**
 * Lấy nickname của user (trả về BOT_NICKNAME nếu là bot)
 */
async function getUserNickname(userId) {
  const User = require("../models/user.model");
  
  try {
    // Kiểm tra nếu là bot
    if (isBot(userId)) {
      return BOT_NICKNAME;
    }
    
    const user = await User.findById(userId).select('nickname username');
    return user?.nickname || user?.username || 'Unknown';
  } catch (error) {
    console.error('Lỗi khi lấy nickname của người dùng:', error);
    return 'Unknown';
  }
}

/**
 * Lấy avatarUrl của user (trả về null nếu là bot)
 */
async function getUserAvatarUrl(userId) {
  const User = require("../models/user.model");
  
  try {
    // Kiểm tra nếu là bot
    if (isBot(userId)) {
      return null;
    }
    
    const user = await User.findById(userId).select('avatarUrl');
    return user?.avatarUrl || null;
  } catch (error) {
    console.error('Lỗi khi lấy avatarUrl của người dùng:', error);
    return null;
  }
}

/**
 * Tìm human player đầu tiên (không phải bot) trong danh sách players
 */
function findFirstHumanPlayer(players) {
  if (!players || players.length === 0) return null;
  
  return players.find(p => !isBotPlayer(p));
}

/**
 * Lọc ra chỉ human players (loại bỏ bot)
 */
function filterHumanPlayers(players) {
  if (!players || players.length === 0) return [];
  return players.filter(p => !isBotPlayer(p));
}

/**
 * Tạo player marks cho bot và host
 */
function createBotPlayerMarks(hostId, firstTurn = 'X') {
  const playerMarks = {};
  
  if (firstTurn === 'X') {
    playerMarks[hostId.toString()] = 'X';
    playerMarks[BOT_ID] = 'O';
  } else {
    playerMarks[hostId.toString()] = 'O';
    playerMarks[BOT_ID] = 'X';
  }
  
  return playerMarks;
}

/**
 * Lấy bot player object từ room
 */
function getBotPlayer(room) {
  if (!room || !room.players) return null;
  return room.players.find(p => 
    p.userId?.toString() === BOT_ID || 
    p.username === BOT_USERNAME
  );
}

/**
 * Lấy bot mark (X hoặc O) từ room
 */
function getBotMark(room) {
  const botPlayer = getBotPlayer(room);
  if (!botPlayer) return null;
  
  const playerMarksObj = room.playerMarks instanceof Map 
    ? Object.fromEntries(room.playerMarks) 
    : (room.playerMarks || {});
  
  return playerMarksObj[botPlayer.userId?.toString()] || 
         playerMarksObj[BOT_ID];
}

/**
 * Lấy bot difficulty từ room
 */
function getBotDifficulty(room) {
  return room.botDifficulty || 'medium';
}

/**
 * Tìm bot player đầu tiên trong danh sách players
 */
function findFirstBotPlayer(players) {
  if (!players || players.length === 0) return null;
  return players.find(p => isBotPlayer(p));
}

module.exports = {
  BOT_ID,
  BOT_USERNAME,
  BOT_NICKNAME,
  isBot,
  isBotPlayer,
  getBotPlayerObject,
  getBotDisplayInfo,
  getUserElo,
  getUserNickname,
  getUserAvatarUrl,
  findFirstHumanPlayer,
  filterHumanPlayers,
  createBotPlayerMarks,
  getBotPlayer,
  getBotMark,
  getBotDifficulty,
  findFirstBotPlayer,
};

