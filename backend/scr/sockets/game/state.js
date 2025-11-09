// state.js
// Quản lý trạng thái game (bàn cờ, lượt chơi, lịch sử)

const { log } = require("./helpers");

/** Board memory - lưu trữ trạng thái game của mỗi phòng */
const roomGames = {};

/** Map để theo dõi socket nào đang ở phòng nào - Sử dụng chung với room socket */
// Import từ room/join.js để đảm bảo đồng bộ
const { socketToRoom } = require("../room/join");

/** Khởi tạo bàn cờ rỗng với kích thước cho trước */
function initBoard(size = 20) {
  return Array(size).fill(null).map(() => Array(size).fill(null));
}

/** Lấy trạng thái game của phòng (bàn cờ, lượt chơi, lịch sử) */
function getGameState(roomId) {
  if (!roomGames[roomId]) {
    roomGames[roomId] = { 
      board: initBoard(), 
      turn: "X", 
      history: [],
      currentPlayerIndex: 0
    };
  }
  return roomGames[roomId];
}

/** Helper: Gửi trạng thái game hiện tại cho tất cả client để đồng bộ */
function emitGameStateSync(io, roomIdStr, room, game, message = null) {
  io.to(roomIdStr).emit("game_state_sync", {
    board: game.board,
    turn: game.turn,
    history: game.history,
    currentPlayer: room.players[game.currentPlayerIndex],
    currentPlayerIndex: game.currentPlayerIndex,
    turnStartTime: game.turnStartTime || Date.now(),
    turnTimeLimit: room.turnTimeLimit || 30,
    message: message,
    timestamp: new Date().toISOString()
  });
}

/** ----------------- INIT GAME (khi game start) ----------------- */
async function initGameForRoom(roomId, players) {
  const roomIdStr = roomId.toString();
  const RoomService = require("../../services/room.service");
  const Room = require("../../models/room.model");
  
  try {
    // Lấy room mới nhất từ DB để đảm bảo có playerMarks và firstTurn mới nhất
    const room = await Room.findById(roomIdStr).lean();
    if (!room) {
      throw new Error("Room not found");
    }
    
    let playerMarksObj = {};
    
    // Luôn sử dụng playerMarks từ room (nếu có)
    if (room.playerMarks) {
      if (room.playerMarks instanceof Map) {
        playerMarksObj = Object.fromEntries(room.playerMarks);
      } else if (typeof room.playerMarks === 'object') {
        playerMarksObj = room.playerMarks;
      }
      log("Using playerMarks from room", playerMarksObj);
    }
    
    // Nếu chưa có playerMarks hoặc không đủ, gán mặc định
    const marksCount = Object.keys(playerMarksObj).filter(key => playerMarksObj[key] === 'X' || playerMarksObj[key] === 'O').length;
    if (marksCount < 2) {
      // Nếu chưa có, gán mặc định: chủ phòng là X, player thứ 2 là O
      if (players && players.length >= 2) {
        const player1Id = players[0]?.userId?.toString();
        const player2Id = players[1]?.userId?.toString();
        
        if (player1Id && player2Id) {
          // Tìm chủ phòng
          const hostPlayer = players.find(p => p.isHost);
          const nonHostPlayer = players.find(p => !p.isHost);
          
          if (hostPlayer && nonHostPlayer) {
            playerMarksObj[hostPlayer.userId.toString()] = "X";
            playerMarksObj[nonHostPlayer.userId.toString()] = "O";
          } else {
            // Fallback: player đầu tiên là X, player thứ 2 là O
            playerMarksObj[player1Id] = "X";
            playerMarksObj[player2Id] = "O";
          }
          
          // Lưu playerMarks vào Room
          try {
            await Room.findByIdAndUpdate(roomIdStr, {
              playerMarks: playerMarksObj
            });
            log("Saved default playerMarks to room", playerMarksObj);
          } catch (dbError) {
            log("Error saving playerMarks to DB", dbError.message);
          }
        } else {
          log("Warning: Cannot assign marks - missing player IDs", { players });
        }
      }
    }
    
    // Lấy firstTurn từ room (mặc định là X) - đảm bảo lấy từ DB
    const firstTurn = (room && room.firstTurn) ? room.firstTurn : 'X';
    log("Using firstTurn from room", { firstTurn, roomFirstTurn: room?.firstTurn, playerMarksObj });
    
    // Xác định currentPlayerIndex dựa trên firstTurn
    let currentPlayerIndex = 0;
    if (players && players.length >= 2 && Object.keys(playerMarksObj).length > 0) {
      // Tìm player có mark = firstTurn
      const firstTurnPlayerIndex = players.findIndex(p => {
        const playerId = p.userId?.toString();
        return playerMarksObj[playerId] === firstTurn;
      });
      
      if (firstTurnPlayerIndex !== -1) {
        currentPlayerIndex = firstTurnPlayerIndex;
        log("Found firstTurn player", { firstTurn, playerIndex: firstTurnPlayerIndex, playerId: players[firstTurnPlayerIndex]?.userId?.toString() });
      } else {
        log("Warning: Could not find player with firstTurn mark", { firstTurn, playerMarksObj, players: players.map(p => ({ userId: p.userId?.toString(), isHost: p.isHost })) });
      }
    }
    
    roomGames[roomIdStr] = { 
      board: initBoard(), 
      turn: firstTurn, 
      history: [],
      currentPlayerIndex: currentPlayerIndex,
      turnStartTime: Date.now(), // Thời gian bắt đầu lượt hiện tại
      turnTimer: null // Timer cho lượt hiện tại
    };
    return roomGames[roomIdStr];
  } catch (err) {
    log("initGameForRoom error", err.message);
    throw err; // Re-throw để handleStartGame có thể catch
  }
}

module.exports = {
  roomGames,
  // socketToRoom được export từ room/join.js, không cần export lại
  initBoard,
  getGameState,
  emitGameStateSync,
  initGameForRoom
};
