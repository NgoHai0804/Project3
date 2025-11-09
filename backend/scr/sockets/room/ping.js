// ping.js
// Xử lý ping tracking và timeout khi đang chơi

const RoomService = require("../../services/room.service");
const UserService = require("../../services/user.service");
const { getGameState } = require("../game/state");
const { log } = require("./helpers");

/** Map theo dõi thời gian ping cuối cùng của mỗi người chơi trong phòng đang chơi */
// Format: roomId -> { userId -> lastPingTime }
const roomPlayerPings = new Map();

/** Map theo dõi timeout ping cho mỗi người chơi trong phòng đang chơi */
// Format: roomId_userId -> timeout
const roomPingTimeouts = new Map();

/** ----------------- PING ROOM (Khi đang chơi) ----------------- */
async function handlePingRoom(io, socket, data) {
  const { roomId } = data;
  const userId = socket.user._id.toString();
  const roomIdStr = roomId?.toString();

  try {
    const room = await RoomService.getRoomById(roomIdStr);
    if (!room || room.status !== "playing") {
      return; // Không phải đang chơi, không cần ping
    }

    // Cập nhật last ping time
    if (!roomPlayerPings.has(roomIdStr)) {
      roomPlayerPings.set(roomIdStr, new Map());
    }
    const pingMap = roomPlayerPings.get(roomIdStr);
    pingMap.set(userId, Date.now());

    // Xóa timeout cũ và tạo timeout mới
    const timeoutKey = `${roomIdStr}_${userId}`;
    const existingTimeout = roomPingTimeouts.get(timeoutKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Bắt đầu timeout mới (30 giây)
    const player = room.players.find(p => p.userId.toString() === userId);
    if (player) {
      startPingTimeout(io, roomIdStr, userId, player.username);
    }

    // Trả về pong với thời gian còn lại trước khi timeout
    const timeout = roomPingTimeouts.get(timeoutKey);
    const timeRemaining = timeout ? 30000 : 0; // 30 giây
    
    socket.emit("room_pong", { 
      roomId: roomIdStr, 
      timestamp: Date.now(),
      timeRemaining: timeRemaining
    });
  } catch (err) {
    log("ping_room error", err.message);
  }
}

/** ----------------- AUTO REMOVE PLAYER ON TIMEOUT ----------------- */
async function autoRemovePlayerOnTimeout(io, roomIdStr, userId, username) {
  try {
    const room = await RoomService.getRoomById(roomIdStr);
    if (!room || room.status !== "playing") {
      return;
    }

    const player = room.players.find(p => p.userId.toString() === userId.toString());
    if (!player) {
      return;
    }

    // Tìm người chơi còn lại (người thắng)
    const winner = room.players.find(p => p.userId.toString() !== userId.toString());
    const winnerNickname = winner?.nickname || winner?.username || "Đối thủ";
    const playerNickname = player?.nickname || player?.username || username;
    const nickname = playerNickname;
    
    // Nếu đang chơi, kết thúc game trước
    if (room.status === "playing") {
      const gameResult = {
        winner: winner?.userId || null,
        winnerUsername: winner?.username || "Đối thủ",
        winnerNickname: winnerNickname,
        loser: userId,
        loserUsername: username,
        loserNickname: nickname,
        message: `${nickname} đã mất kết nối quá lâu và bị đẩy ra khỏi phòng. ${winnerNickname} thắng!`,
        isTimeout: true
      };

      await RoomService.endGame({ 
        roomId: roomIdStr, 
        result: gameResult 
      });

      // Cập nhật gameStats cho người thắng và thua (timeout) - tách riêng để đảm bảo cả 2 đều được cập nhật
      const winnerUserId = winner?.userId ? winner.userId.toString() : null;
      const loserUserId = userId ? userId.toString() : null;
      
      log("Ping timeout - winner and loser", { 
        winnerId: winnerUserId, 
        winnerUsername: winner?.username,
        loserId: loserUserId, 
        loserUsername: username
      });
      
      if (winnerUserId) {
        try {
          await UserService.updateGameStats(winnerUserId, "caro", true, false);
          log("Winner stats updated successfully (ping timeout)");
        } catch (statsError) {
          log("updateGameStats error for winner on timeout", statsError.message);
        }
      }
      if (loserUserId) {
        try {
          await UserService.updateGameStats(loserUserId, "caro", false, false);
          log("Loser stats updated successfully (ping timeout)");
        } catch (statsError) {
          log("updateGameStats error for loser on timeout", statsError.message);
        }
      }

      // Thông báo game end
      const game = getGameState(roomIdStr);
      io.to(roomIdStr).emit("game_end", {
        result: gameResult,
        board: game?.board || null,
        message: `${playerNickname} đã mất kết nối quá lâu`,
        timestamp: new Date().toISOString()
      });
    }

    // Đẩy player ra khỏi phòng
    const roomAfter = await RoomService.removeDisconnectedPlayer({ 
      roomId: roomIdStr, 
      userId 
    });

    if (roomAfter) {
      // Thông báo player bị đẩy ra
      io.to(roomIdStr).emit("player_left", { 
        userId, 
        username,
        nickname: playerNickname,
        room: roomAfter,
        message: `${playerNickname} đã bị đẩy ra khỏi phòng do mất kết nối quá lâu`,
        timestamp: new Date().toISOString() 
      });

      io.to(roomIdStr).emit("room_update", {
        room: roomAfter,
        message: `${playerNickname} đã bị đẩy ra khỏi phòng`,
        timestamp: new Date().toISOString()
      });
    } else {
      // Phòng đã bị xóa
      io.to(roomIdStr).emit("room_deleted", {
        message: "Phòng đã bị xóa vì không còn người chơi",
        timestamp: new Date().toISOString()
      });
    }

    // Cleanup ping tracking
    cleanupPingTracking(roomIdStr, userId);

    log("Player removed - timeout", { roomId: roomIdStr, userId, username });
  } catch (err) {
    log("autoRemovePlayerOnTimeout error", err.message);
  }
}

/** ----------------- START PING TIMEOUT ----------------- */
function startPingTimeout(io, roomIdStr, userId, username) {
  const timeoutKey = `${roomIdStr}_${userId}`;
  
  // Xóa timeout cũ nếu có
  const existingTimeout = roomPingTimeouts.get(timeoutKey);
  if (existingTimeout) {
    clearTimeout(existingTimeout);
  }

  // Tạo timeout mới (30 giây)
  const timeout = setTimeout(async () => {
    try {
      const room = await RoomService.getRoomById(roomIdStr);
      if (!room || room.status !== "playing") {
        roomPingTimeouts.delete(timeoutKey);
        return; // Không phải đang chơi nữa
      }

      // Kiểm tra xem player có còn trong phòng không
      const player = room.players.find(p => p.userId.toString() === userId);
      if (!player) {
        roomPingTimeouts.delete(timeoutKey);
        return;
      }

      // Kiểm tra last ping time
      const pingMap = roomPlayerPings.get(roomIdStr);
      if (pingMap) {
        const lastPing = pingMap.get(userId);
        const now = Date.now();
        // Nếu không có ping trong 30 giây, tự động đầu hàng
        if (!lastPing || (now - lastPing) > 30000) {
          log("Player timeout - auto surrender", { roomId: roomIdStr, userId, username });
          
          // Tự động đẩy player ra khỏi phòng
          await autoRemovePlayerOnTimeout(io, roomIdStr, userId, username);
        }
      }
    } catch (err) {
      log("Ping timeout error", err.message);
      roomPingTimeouts.delete(timeoutKey);
    }
  }, 30000); // 30 giây

  roomPingTimeouts.set(timeoutKey, timeout);
}

/** ----------------- CLEANUP PING TRACKING ----------------- */
function cleanupPingTracking(roomIdStr, userId) {
  const timeoutKey = `${roomIdStr}_${userId}`;
  const timeout = roomPingTimeouts.get(timeoutKey);
  if (timeout) {
    clearTimeout(timeout);
    roomPingTimeouts.delete(timeoutKey);
  }

  const pingMap = roomPlayerPings.get(roomIdStr);
  if (pingMap) {
    pingMap.delete(userId);
    if (pingMap.size === 0) {
      roomPlayerPings.delete(roomIdStr);
    }
  }
}

/** ----------------- CLEANUP ALL PING TRACKING FOR ROOM ----------------- */
function cleanupAllPingTracking(roomIdStr) {
  const pingMap = roomPlayerPings.get(roomIdStr);
  if (pingMap) {
    // Cleanup tất cả timeouts cho phòng này
    pingMap.forEach((_, userId) => {
      const timeoutKey = `${roomIdStr}_${userId}`;
      const timeout = roomPingTimeouts.get(timeoutKey);
      if (timeout) {
        clearTimeout(timeout);
        roomPingTimeouts.delete(timeoutKey);
      }
    });
    roomPlayerPings.delete(roomIdStr);
  }
}

module.exports = {
  handlePingRoom,
  startPingTimeout,
  cleanupPingTracking,
  cleanupAllPingTracking,
  roomPlayerPings
};
