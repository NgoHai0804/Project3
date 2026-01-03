// bot.js

const botMoveService = require("../../services/botMove.service");
const { getGameState, roomGames } = require("./state");
const { log } = require("./helpers");
const BotService = require("../../services/bot.service");

// Lazy load handleMakeMove
let handleMakeMove;
function getHandleMakeMove() {
  if (!handleMakeMove) {
    const moveModule = require("./move");
    handleMakeMove = moveModule.handleMakeMove;
  }
  return handleMakeMove;
}

// Import bot constants
const BOT_ID = BotService.BOT_ID;
const BOT_USERNAME = BotService.BOT_USERNAME;
const BOT_NICKNAME = BotService.BOT_NICKNAME;

// Lazy load RoomService
let RoomService;
function getRoomService() {
  if (!RoomService) {
    RoomService = require("../../services/room.service");
  }
  return RoomService;
}

/**
 * Kiểm tra xem phòng có đang chơi với bot không
 */
async function isBotRoom(roomId) {
  try {
    const room = await getRoomService().getRoomById(roomId.toString());
    if (!room) return false;
    
    // Kiểm tra nếu có bot trong players hoặc mode là P2B
    const hasBot = room.players?.some(p => 
      p.userId?.toString() === BOT_ID || 
      p.username === BOT_USERNAME
    );
    
    return hasBot || room.mode === 'P2B';
  } catch (err) {
    log("Error checking bot room", err.message);
    return false;
  }
}

/**
 * Kiểm tra xem player hiện tại có phải là bot không
 */
async function isCurrentPlayerBot(roomId) {
  try {
    const room = await getRoomService().getRoomById(roomId.toString());
    if (!room) {
      log("isCurrentPlayerBot: Room not found", { roomId: roomId.toString() });
      return false;
    }
    
    const game = getGameState(roomId.toString());
    if (!game) {
      log("isCurrentPlayerBot: Game state not found", { roomId: roomId.toString() });
      return false;
    }
    
    const currentPlayer = room.players[game.currentPlayerIndex];
    
    if (!currentPlayer) {
      log("isCurrentPlayerBot: Current player not found", { 
        roomId: roomId.toString(),
        currentPlayerIndex: game.currentPlayerIndex,
        playersCount: room.players.length
      });
      return false;
    }
    
    const isBot = currentPlayer.userId?.toString() === BOT_ID || 
                  currentPlayer.username === BOT_USERNAME;
    
    log("isCurrentPlayerBot", { 
      roomId: roomId.toString(),
      currentPlayerIndex: game.currentPlayerIndex,
      currentPlayerId: currentPlayer.userId?.toString(),
      currentPlayerUsername: currentPlayer.username,
      isBot: isBot
    });
    
    return isBot;
  } catch (err) {
    log("Error checking current player bot", err.message);
    log("Error stack", err.stack);
    return false;
  }
}

/**
 * Lấy bot player object từ room
 */
function getBotPlayer(room) {
  return room.players?.find(p => 
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
 * Bot tự động thực hiện nước đi
 */
async function makeBotMove(io, roomId) {
  const roomIdStr = roomId.toString();
  
  try {
    // Kiểm tra xem có phải lượt bot không
    const isBotTurn = await isCurrentPlayerBot(roomIdStr);
    if (!isBotTurn) {
      log("Not bot turn, skipping bot move", { roomId: roomIdStr });
      return;
    }
    
    // Kiểm tra game đang playing
    const room = await getRoomService().getRoomById(roomIdStr);
    if (!room || room.status !== "playing") {
      log("Room not playing, skipping bot move", { roomId: roomIdStr });
      return;
    }
    
    const game = getGameState(roomIdStr);
    
    // Tính toán nước đi bằng P2BGameService
    const P2BGameService = require("../../services/p2bGame.service");
    
    if (!P2BGameService.isP2BRoom(room)) {
      log("Room is not P2B, skipping bot move", { roomId: roomIdStr });
      return;
    }
    
    // Tính toán nước đi cho bot trong P2B game
    let botMove;
    try {
      botMove = P2BGameService.calculateBotMoveForP2B(room, game);
      log("Bot calculating move (P2B)", { roomId: roomIdStr, botMove });
    } catch (calcError) {
      log("Error calculating bot move", { roomId: roomIdStr, error: calcError.message });
      return;
    }
    
    log("Bot move calculated", { roomId: roomIdStr, botMove });
    
    if (!botMove || botMove.x === undefined || botMove.y === undefined) {
      log("Bot move invalid", { roomId: roomIdStr, botMove });
      return;
    }
    
    // Tạo fake socket cho bot
    const fakeSocket = {
      user: {
        _id: BOT_ID,
        username: BOT_USERNAME,
        nickname: BOT_NICKNAME
      },
      id: `bot_${roomIdStr}`,
      emit: () => {} // Bot không cần emit gì
    };
    
    // Gọi handleMakeMove
    const BotService = require("../../services/bot.service");
    const botMark = BotService.getBotMark(room);
    log("Bot making move", { roomId: roomIdStr, x: botMove.x, y: botMove.y, botMark: botMark || 'unknown' });
    try {
      const makeMoveHandler = getHandleMakeMove();
      log("Got handleMakeMove function", { roomId: roomIdStr, isFunction: typeof makeMoveHandler === 'function' });
      
      if (typeof makeMoveHandler !== 'function') {
        log("ERROR: handleMakeMove is not a function", { roomId: roomIdStr, type: typeof makeMoveHandler });
        return;
      }
      
      await makeMoveHandler(io, fakeSocket, {
        roomId: roomIdStr,
        x: botMove.x,
        y: botMove.y
      });
      
      log("Bot move completed", { roomId: roomIdStr, x: botMove.x, y: botMove.y });
    } catch (moveError) {
      log("Error calling handleMakeMove", { 
        roomId: roomIdStr, 
        error: moveError.message,
        stack: moveError.stack 
      });
      throw moveError;
    }
    
  } catch (err) {
    log("Error making bot move", err.message);
    log("Error stack", err.stack);
  }
}

/**
 * Trigger bot move sau khi player move (nếu đến lượt bot)
 */
async function triggerBotMoveIfNeeded(io, roomId) {
  const roomIdStr = roomId.toString();
  
  try {
    log("triggerBotMoveIfNeeded called", { roomId: roomIdStr });
    
    // Đợi một chút để đảm bảo move của player đã được xử lý xong (delay tối thiểu)
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Kiểm tra xem có phải lượt bot không
    const isBotTurn = await isCurrentPlayerBot(roomIdStr);
    log("triggerBotMoveIfNeeded - isBotTurn", { roomId: roomIdStr, isBotTurn });
    
    if (isBotTurn) {
      log("Triggering bot move", { roomId: roomIdStr });
      await makeBotMove(io, roomIdStr);
      
      // Sau khi bot đánh, kiểm tra lại xem có cần đánh tiếp không (nếu bot đi liên tiếp)
      // Nhưng thực tế bot chỉ đánh 1 lần mỗi lượt, nên không cần check lại
    } else {
      log("Not bot turn, skipping bot move", { roomId: roomIdStr });
    }
  } catch (err) {
    log("Error triggering bot move", err.message);
    log("Error stack", err.stack);
  }
}

module.exports = {
  BOT_ID,
  BOT_USERNAME,
  BOT_NICKNAME,
  isBotRoom,
  isCurrentPlayerBot,
  getBotPlayer,
  getBotMark,
  getBotDifficulty,
  makeBotMove,
  triggerBotMoveIfNeeded
};

