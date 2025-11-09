// leave.js
// Xử lý rời phòng (leave_room)

const RoomService = require("../../services/room.service");
const UserService = require("../../services/user.service");
const { getGameState, roomGames } = require("../game/state");
const { cleanupMoveLock } = require("../game/move");
const { cleanupPingTracking, cleanupAllPingTracking } = require("./ping");
const { socketToRoom } = require("./join");
const { log } = require("./helpers");

/** ----------------- LEAVE ROOM ----------------- */
async function handleLeaveRoom(io, socket, data) {
  const { roomId } = data;
  const userId = socket.user._id;
  const username = socket.user.username;
  const nickname = socket.user.nickname || socket.user.username;
  const roomIdStr = roomId.toString();

  log("leave_room được gọi", { roomId: roomIdStr, userId, username, nickname });

  try {
    const roomBefore = await RoomService.getRoomById(roomIdStr);
    if (!roomBefore) {
      socket.emit("leave_error", { message: "Phòng không tồn tại" });
      return;
    }

    // Nếu đang chơi, tự động kết thúc game với kết quả là người còn lại thắng
    if (roomBefore.status === "playing") {
      log("Người chơi rời phòng khi đang chơi - tự động đầu hàng", { roomId: roomIdStr, userId, username });
      
      // Tìm người chơi còn lại (người thắng)
      const winner = roomBefore.players.find(p => p.userId.toString() !== userId.toString());
      const winnerNickname = winner?.nickname || winner?.username || "Đối thủ";
      
      if (winner) {
        const gameResult = {
          winner: winner.userId,
          winnerUsername: winner.username,
          winnerNickname: winnerNickname,
          loser: userId,
          loserUsername: username,
          loserNickname: nickname,
          message: `${nickname} đã rời phòng. ${winnerNickname} thắng!`,
          isSurrender: true,
          isLeaveRoom: true
        };

        // Kết thúc game
        await RoomService.endGame({ 
          roomId: roomIdStr, 
          result: gameResult 
        });

        // Cập nhật gameStats cho người thắng và thua - tách riêng để đảm bảo cả 2 đều được cập nhật
        const winnerUserId = winner.userId ? winner.userId.toString() : null;
        const loserUserId = userId ? userId.toString() : null;
        
        log("Leave room - winner and loser", { 
          winnerId: winnerUserId, 
          winnerUsername: winner?.username,
          loserId: loserUserId, 
          loserUsername: username
        });
        
        if (winnerUserId) {
          try {
            await UserService.updateGameStats(winnerUserId, "caro", true, false);
            log("Winner stats updated successfully (leave room)");
          } catch (statsError) {
            log("updateGameStats error for winner when leaving room", statsError.message);
          }
        }
        if (loserUserId) {
          try {
            await UserService.updateGameStats(loserUserId, "caro", false, false);
            log("Loser stats updated successfully (leave room)");
          } catch (statsError) {
            log("updateGameStats error for loser when leaving room", statsError.message);
            // Không block leave room nếu update stats lỗi
          }
        }

        // Lấy game state nếu có
        const game = getGameState(roomIdStr);
        const roomAfterEnd = await RoomService.getRoomById(roomIdStr);

        // Thông báo game_end cho tất cả user trong phòng
        io.to(roomIdStr).emit("game_end", {
          result: gameResult,
          board: game?.board || null,
          message: `${nickname} đã rời phòng. ${winnerNickname} thắng!`,
          timestamp: new Date().toISOString()
        });

        // Cập nhật trạng thái phòng
        io.to(roomIdStr).emit("room_update", {
          room: roomAfterEnd,
          message: "Game đã kết thúc",
          timestamp: new Date().toISOString()
        });

        // Cập nhật status = 'online' cho tất cả players (nếu vẫn còn socket)
        try {
          roomAfterEnd.players.forEach(async (player) => {
            if (player.userId) {
              await UserService.updateUserStatus(player.userId.toString(), "online");
            }
          });
        } catch (statusError) {
          log("Error updating player status to online when leaving room", statusError.message);
        }

        // Cleanup ping tracking cho tất cả players
        cleanupAllPingTracking(roomIdStr);

        // 🔓 Giải phóng lock khi xóa game state
        cleanupMoveLock(roomIdStr);

        // Xóa game state
        if (game && roomGames[roomIdStr]) {
          delete roomGames[roomIdStr];
        }

        log("Game ended - player left room", { roomId: roomIdStr, winner: winner.username, loser: username });
      }
    }

    // Rời phòng như bình thường
    const roomAfter = await RoomService.leaveRoom({ roomId: roomIdStr, userId });

    socketToRoom.delete(socket.id);
    socket.leave(roomIdStr);

    // Cleanup ping tracking khi rời phòng
    cleanupPingTracking(roomIdStr, userId.toString());

    // Cập nhật status = 'online' khi rời phòng (nếu không đang chơi)
    if (roomBefore.status !== "playing") {
      try {
        await UserService.updateUserStatus(userId.toString(), "online");
      } catch (statusError) {
        log("Error updating user status to online when leaving room", statusError.message);
      }
    }

    // 1️⃣ Thông báo cho user vừa rời phòng
    socket.emit("leave_success", { 
      message: roomBefore.status === "playing" ? "Bạn đã rời phòng (tự động thua)" : "Bạn đã rời phòng",
      timestamp: new Date().toISOString()
    });

    if (roomAfter) {
      // 2️⃣ Thông báo cho các user khác trong phòng về việc player rời phòng
      io.to(roomIdStr).emit("player_left", { 
        userId, 
        username,
        nickname,
        room: roomAfter,
        message: `${nickname} đã rời phòng`,
        timestamp: new Date().toISOString() 
      });

      // 3️⃣ Cập nhật trạng thái phòng cho tất cả user còn lại
      io.to(roomIdStr).emit("room_update", {
        room: roomAfter,
        message: `${nickname} đã rời phòng`,
        timestamp: new Date().toISOString()
      });
    } else {
      // Phòng đã bị xóa (không còn ai) - thông báo cho tất cả user đã rời
      io.to(roomIdStr).emit("room_deleted", {
        message: "Phòng đã bị xóa vì không còn người chơi",
        timestamp: new Date().toISOString()
      });
      log("Room deleted (empty)", { roomId: roomIdStr });
    }

    log("Player left successfully", { roomId: roomIdStr, userId, username });

  } catch (err) {
    log("leave_room error", err.message);
    socket.emit("leave_error", { message: err.message });
  }
}

module.exports = {
  handleLeaveRoom
};
