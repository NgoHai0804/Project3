// index.js
// Main room socket handler - tổng hợp tất cả các handlers

const RoomService = require("../../services/room.service");
const UserService = require("../../services/user.service");
const { getGameState, roomGames } = require("../game/state");
const { cleanupMoveLock } = require("../game/move");
const { cleanupPingTracking } = require("./ping");
const { socketToRoom } = require("./join");
const { handleJoinRoom } = require("./join");
const { handlePlayerReady } = require("./ready");
const { handleStartGame } = require("./start");
const { handleUpdateRoomSettings } = require("./settings");
const { handleLeaveRoom } = require("./leave");
const { handleKickPlayer } = require("./kick");
const { handlePingRoom } = require("./ping");
const { handleCheckAndReconnect } = require("./reconnect");
const { handleInviteToRoom } = require("./invite");
const { log } = require("./helpers");

/** Map theo dõi timeout cho việc xử lý disconnect delay (cho phép reconnect) */
const disconnectTimeouts = new Map();

/** ----------------- DISCONNECT ----------------- */
async function handleDisconnect(io, socket) {
  const roomIdStr = socketToRoom.get(socket.id);
  if (!roomIdStr) {
    log("disconnect - no room", { socketId: socket.id });
    return;
  }

  const userId = socket.user?._id;
  const username = socket.user?.username || "Unknown";
  const nickname = socket.user?.nickname || socket.user?.username || "Unknown";

  try {
    const room = await RoomService.getRoomById(roomIdStr);
    if (!room) {
      socketToRoom.delete(socket.id);
      return;
    }

    const player = room.players.find(p => p.userId.toString() === userId?.toString());
    if (!player) {
      socketToRoom.delete(socket.id);
      return;
    }

    // Xóa timeout cũ nếu có (trường hợp reconnect trước khi hết thời gian chờ)
    const existingTimeout = disconnectTimeouts.get(userId.toString());
    if (existingTimeout) {
      clearTimeout(existingTimeout);
      disconnectTimeouts.delete(userId.toString());
    }

    // Cleanup ping tracking ngay khi disconnect
    cleanupPingTracking(roomIdStr, userId.toString());

    // Kiểm tra số lượng player trong phòng
    const activePlayers = room.players.filter(p => !p.isDisconnected);
    
    // Nếu phòng chỉ có 1 user và user đó disconnect, tự động hủy phòng
    if (activePlayers.length === 1 && activePlayers[0].userId.toString() === userId.toString()) {
      // Nếu đang chơi, kết thúc game trước
      if (room.status === "playing") {
        const gameResult = {
          winner: null,
          winnerUsername: null,
          winnerNickname: null,
          loser: userId,
          loserUsername: username,
          loserNickname: nickname,
          message: `${nickname} đã mất kết nối. Game kết thúc.`,
          isTimeout: true
        };

        await RoomService.endGame({ 
          roomId: roomIdStr, 
          result: gameResult 
        });

        // Cleanup game state
        cleanupMoveLock(roomIdStr);
        if (roomGames[roomIdStr]) {
          delete roomGames[roomIdStr];
        }
      }

      // Xóa phòng ngay lập tức
      const Room = require("../../models/room.model");
      await Room.findByIdAndDelete(roomIdStr);
      io.to(roomIdStr).emit("room_deleted", {
        message: "Phòng đã bị hủy vì chủ phòng đã ngắt kết nối",
        timestamp: new Date().toISOString()
      });
      socketToRoom.delete(socket.id);
      socket.leave(roomIdStr);
      log("Room deleted (only 1 player disconnected)", { roomId: roomIdStr, userId, username });
      return;
    }

    // Nếu đang chơi, kết thúc game trước khi xóa player
    if (room.status === "playing") {
      // Tìm người chơi còn lại (người thắng)
      const winner = room.players.find(p => p.userId.toString() !== userId.toString());
      const winnerNickname = winner?.nickname || winner?.username || "Đối thủ";
      
      if (winner) {
        const gameResult = {
          winner: winner.userId,
          winnerUsername: winner.username,
          winnerNickname: winnerNickname,
          loser: userId,
          loserUsername: username,
          loserNickname: nickname,
          message: `${nickname} đã mất kết nối. ${winnerNickname} thắng!`,
          isTimeout: true
        };

        await RoomService.endGame({ 
          roomId: roomIdStr, 
          result: gameResult 
        });

        // Cập nhật gameStats - tách riêng để đảm bảo cả 2 đều được cập nhật
        const winnerUserId = winner.userId ? winner.userId.toString() : null;
        const loserUserId = userId ? userId.toString() : null;
        
        log("Disconnect - winner and loser", { 
          winnerId: winnerUserId, 
          winnerUsername: winner?.username,
          loserId: loserUserId, 
          loserUsername: username
        });
        
        if (winnerUserId) {
          try {
            await UserService.updateGameStats(winnerUserId, "caro", true, false);
            log("Winner stats updated successfully (disconnect)");
          } catch (statsError) {
            log("updateGameStats error for winner on disconnect", statsError.message);
          }
        }
        if (loserUserId) {
          try {
            await UserService.updateGameStats(loserUserId, "caro", false, false);
            log("Loser stats updated successfully (disconnect)");
          } catch (statsError) {
            log("updateGameStats error for loser on disconnect", statsError.message);
          }
        }

        // Thông báo game end
        const game = getGameState(roomIdStr);
        io.to(roomIdStr).emit("game_end", {
          result: gameResult,
          board: game?.board || null,
          message: `${nickname} đã mất kết nối`,
          timestamp: new Date().toISOString()
        });

        // Cleanup game state
        cleanupMoveLock(roomIdStr);
        if (roomGames[roomIdStr]) {
          delete roomGames[roomIdStr];
        }
      }
    }

    // Xóa player khỏi phòng ngay lập tức
    const roomAfter = await RoomService.removeDisconnectedPlayer({ 
      roomId: roomIdStr, 
      userId 
    });

    socketToRoom.delete(socket.id);
    socket.leave(roomIdStr);

    // Cập nhật status = 'online' khi rời phòng (nếu không đang chơi)
    if (room.status !== "playing") {
      try {
        await UserService.updateUserStatus(userId.toString(), "online");
      } catch (statusError) {
        log("Error updating user status to online when leaving room", statusError.message);
      }
    }

    if (roomAfter) {
      // Thông báo cho các user khác trong phòng
      io.to(roomIdStr).emit("player_left", { 
        userId, 
        username,
        nickname,
        room: roomAfter,
        message: `${nickname} đã rời phòng (mất kết nối)`,
        timestamp: new Date().toISOString() 
      });

      io.to(roomIdStr).emit("room_update", {
        room: roomAfter,
        message: `${nickname} đã rời phòng`,
        timestamp: new Date().toISOString()
      });
    } else {
      // Phòng đã bị xóa
      io.to(roomIdStr).emit("room_deleted", {
        message: "Phòng đã bị xóa vì không còn người chơi",
        timestamp: new Date().toISOString()
      });
    }

    log("player disconnected and removed immediately", { roomId: roomIdStr, userId, username });

  } catch (err) {
    log("disconnect error", err.message);
    socketToRoom.delete(socket.id);
  }
}

/** ----------------- EXPORT MODULE ----------------- */
function roomSocket(io, socket) {
  socket.on("join_room", (data) => handleJoinRoom(io, socket, data));
  socket.on("player_ready", (data) => handlePlayerReady(io, socket, data));
  socket.on("start_game", (data) => handleStartGame(io, socket, data));
  socket.on("leave_room", (data) => handleLeaveRoom(io, socket, data));
  socket.on("invite_to_room", (data) => handleInviteToRoom(io, socket, data));
  socket.on("check_reconnect", () => handleCheckAndReconnect(io, socket));
  socket.on("ping_room", (data) => handlePingRoom(io, socket, data));
  socket.on("ping_server", () => socket.emit("pong", { message: "Pong from server!" }));
  socket.on("update_room_settings", (data) => handleUpdateRoomSettings(io, socket, data));
  socket.on("kick_player", (data) => handleKickPlayer(io, socket, data));
  socket.on("disconnect", () => handleDisconnect(io, socket));
}

module.exports = roomSocket;
module.exports.cleanupAllPingTracking = require("./ping").cleanupAllPingTracking;
