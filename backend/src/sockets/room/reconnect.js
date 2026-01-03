// reconnect.js
// Xử lý kết nối lại (check_reconnect)

const RoomService = require("../../services/room.service");
const { getGameState } = require("../game/state");
const { socketToRoom } = require("./join");
const { startPingTimeout } = require("./ping");
const { roomPlayerPings } = require("./ping");
const { log } = require("./helpers");

/** Map theo dõi timeout cho việc xử lý disconnect delay (cho phép reconnect) */
const disconnectTimeouts = new Map();

/** ----------------- CHECK AND RECONNECT ----------------- */
async function handleCheckAndReconnect(io, socket) {
  const userId = socket.user?._id;
  const username = socket.user?.username || "Unknown";
  const nickname = socket.user?.nickname || socket.user?.username || "Unknown";

  try {
    // Tìm phòng mà user đang tham gia
    const room = await RoomService.findRoomByUserId(userId);
    
    if (!room) {
      socket.emit("reconnect_check", { 
        inRoom: false,
        message: "Bạn không có trong phòng nào"
      });
      return;
    }

    // Kiểm tra xem player có đang disconnected không
    const player = room.players.find(p => p.userId.toString() === userId.toString());
    if (!player) {
      socket.emit("reconnect_check", { 
        inRoom: false,
        message: "Không tìm thấy thông tin người chơi"
      });
      return;
    }

    // Nếu player đang disconnected, đánh dấu là reconnected
    if (player.isDisconnected) {
      // Xóa timeout disconnect nếu có
      const existingTimeout = disconnectTimeouts.get(userId.toString());
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        disconnectTimeouts.delete(userId.toString());
      }

      // Đánh dấu reconnected
      const sessionId = require("uuid").v4();
      await RoomService.markPlayerReconnected({ 
        roomId: room._id, 
        userId, 
        sessionId 
      });
      
      const roomAfter = await RoomService.getRoomById(room._id);
      const roomIdStr = room._id.toString();
      
      // Join lại socket room
      socketToRoom.set(socket.id, roomIdStr);
      socket.join(roomIdStr);

      // Lấy game state nếu đang chơi
      let gameState = null;
      if (roomAfter.status === "playing") {
        const game = getGameState(roomIdStr);
        if (game) {
          gameState = {
            board: game.board,
            turn: game.turn,
            history: game.history,
            currentPlayerIndex: game.currentPlayerIndex,
          };
          
          // Init ping tracking
          if (!roomPlayerPings.has(roomIdStr)) {
            roomPlayerPings.set(roomIdStr, new Map());
          }
          const pingMap = roomPlayerPings.get(roomIdStr);
          const BotService = require("../../services/bot.service");
          // Bỏ qua bot - bot không cần ping tracking
          if (!BotService.isBot(userId.toString())) {
            pingMap.set(userId.toString(), Date.now());
            startPingTimeout(io, roomIdStr, userId.toString(), username);
          }
        }
      }

      // Thông báo cho user
      socket.emit("reconnect_success", {
        room: roomAfter,
        gameState: gameState,
        message: "Đã kết nối lại với phòng thành công",
        timestamp: new Date().toISOString()
      });

      // Thông báo cho các user khác
      socket.to(roomIdStr).emit("player_reconnected", {
        userId,
        username,
        nickname,
        room: roomAfter,
        message: `${nickname} đã kết nối lại`,
        timestamp: new Date().toISOString()
      });

      io.to(roomIdStr).emit("room_update", {
        room: roomAfter,
        message: `${nickname} đã kết nối lại`,
        timestamp: new Date().toISOString()
      });

      log("Player reconnected", { roomId: roomIdStr, userId, username });
    } else {
      // Player chưa disconnected, chỉ cần join lại socket room
      const roomIdStr = room._id.toString();
      socketToRoom.set(socket.id, roomIdStr);
      socket.join(roomIdStr);

      // Lấy game state nếu đang chơi
      let gameState = null;
      if (room.status === "playing") {
        const game = getGameState(room._id.toString());
        if (game) {
          gameState = {
            board: game.board,
            turn: game.turn,
            history: game.history,
            currentPlayerIndex: game.currentPlayerIndex,
          };
          
          // Init ping tracking
          if (!roomPlayerPings.has(room._id.toString())) {
            roomPlayerPings.set(room._id.toString(), new Map());
          }
          const pingMap = roomPlayerPings.get(room._id.toString());
          pingMap.set(userId.toString(), Date.now());
          startPingTimeout(io, room._id.toString(), userId.toString(), username);
        }
      }

      socket.emit("reconnect_check", {
        inRoom: true,
        room: room,
        gameState: gameState,
        message: "Bạn vẫn đang trong phòng"
      });
    }
  } catch (err) {
    log("reconnect check error", err.message);
    socket.emit("reconnect_check", {
      inRoom: false,
      error: err.message
    });
  }
}

module.exports = {
  handleCheckAndReconnect
};
