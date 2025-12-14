// move.js
// Xử lý các nước đi trong game (make_move, undo_move, reset_game)

const RoomService = require("../../services/room.service");
const UserService = require("../../services/user.service");
const GameCaroService = require("../../services/gameCaro.service");
const { checkWinner } = require("../../utils/checkWinner");
const { getGameState, emitGameStateSync, roomGames, initBoard } = require("./state");
const { startTurnTimer, stopTurnTimer } = require("./timer");
const { log, updatePlayersStatusToOnline } = require("./helpers");

/** Map để lock việc xử lý move cho mỗi phòng - tránh race condition */
// Format: roomId -> boolean (true = đang xử lý move)
const roomMoveLocks = new Map();

/** Xử lý khi người chơi đánh cờ */
async function handleMakeMove(io, socket, data) {
  const { roomId, x, y } = data;
  const userId = socket.user._id;
  const username = socket.user.username;
  const nickname = socket.user.nickname || socket.user.username;
  const roomIdStr = roomId.toString();

  log("make_move", { roomId: roomIdStr, userId, username, x, y });

  // Kiểm tra và đặt khóa để tránh xử lý nhiều move cùng lúc
  if (roomMoveLocks.get(roomIdStr)) {
    socket.emit("move_error", { message: "Đang xử lý nước đi khác, vui lòng đợi" });
    return;
  }

  // Đặt khóa để bắt đầu xử lý move
  roomMoveLocks.set(roomIdStr, true);

  try {
    // Bước 1: Kiểm tra phòng có tồn tại và đang trong trạng thái playing không
    const room = await RoomService.getRoomById(roomIdStr);
    if (!room) {
      roomMoveLocks.delete(roomIdStr);
      socket.emit("move_error", { message: "Phòng không tồn tại" });
      return;
    }

    if (room.status !== "playing") {
      roomMoveLocks.delete(roomIdStr);
      socket.emit("move_error", { message: "Game chưa bắt đầu hoặc đã kết thúc" });
      // Gửi trạng thái game để client đồng bộ
      const game = getGameState(roomIdStr);
      emitGameStateSync(io, roomIdStr, room, game, "Game chưa bắt đầu hoặc đã kết thúc");
      return;
    }

    // Bước 2: Kiểm tra người chơi có trong phòng không
    const player = room.players.find(p => p.userId.toString() === userId.toString());
    if (!player) {
      roomMoveLocks.delete(roomIdStr);
      socket.emit("move_error", { message: "Bạn không ở trong phòng này" });
      return;
    }

    // Bước 3: Lấy trạng thái game hiện tại
    const game = getGameState(roomIdStr);

    // Bước 4: Kiểm tra có đúng lượt của người chơi này không
    const currentPlayer = room.players[game.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.userId.toString() !== userId.toString()) {
      roomMoveLocks.delete(roomIdStr);
      const currentPlayerNickname = currentPlayer ? (currentPlayer.nickname || currentPlayer.username) : "Unknown";
      socket.emit("move_error", { 
        message: "Chưa đến lượt bạn",
        currentPlayer: currentPlayerNickname
      });
      // Gửi trạng thái game để client biết lượt hiện tại
      emitGameStateSync(io, roomIdStr, room, game, "Chưa đến lượt bạn");
      return;
    }

    // Bước 5: Kiểm tra vị trí (x, y) có hợp lệ không
    if (x < 0 || x >= game.board.length || y < 0 || y >= game.board[0].length) {
      roomMoveLocks.delete(roomIdStr);
      socket.emit("move_error", { message: "Vị trí không hợp lệ" });
      // Gửi trạng thái game để đồng bộ
      emitGameStateSync(io, roomIdStr, room, game);
      return;
    }

    // Kiểm tra vị trí đã có cờ chưa
    if (game.board[x][y] !== null) {
      roomMoveLocks.delete(roomIdStr);
      socket.emit("move_error", { message: "Vị trí này đã có cờ" });
      // Gửi trạng thái game để đồng bộ
      emitGameStateSync(io, roomIdStr, room, game);
      return;
    }

    // Bước 6: Đánh cờ (lưu trạng thái cũ để có thể rollback nếu có lỗi)
    const mark = game.turn;
    const previousBoardState = JSON.parse(JSON.stringify(game.board));
    const previousHistoryLength = game.history.length;
    
    // Cập nhật bàn cờ và lịch sử
    game.board[x][y] = mark;
    game.history.push({ x, y, mark, userId, username, nickname, timestamp: new Date().toISOString() });

    // Bước 7: Kiểm tra người chơi có thắng không
    let isWinner = false;
    let gameResult = null;
    
    try {
      isWinner = checkWinner(game.board, x, y);
    } catch (checkError) {
      // Nếu có lỗi khi kiểm tra thắng, rollback lại trạng thái cũ
      log("Error checking winner, rolling back", checkError.message);
      game.board = previousBoardState;
      game.history = game.history.slice(0, previousHistoryLength);
      roomMoveLocks.delete(roomIdStr);
      socket.emit("move_error", { message: "Lỗi khi kiểm tra thắng thua" });
      emitGameStateSync(io, roomIdStr, room, game);
      return;
    }

    // Kiểm tra hòa (bàn cờ đầy)
    const isDraw = game.board.every(row => row.every(cell => cell !== null));

    // Thông báo nước đi cho tất cả user trong phòng TRƯỚC khi thông báo kết quả
    // Đảm bảo cả 2 người chơi đều thấy nước đi cuối cùng
    const turnTimeLimitForMove = room.turnTimeLimit || 30;
    const lastMove = {
      x,
      y,
      mark,
      userId,
      username,
      board: game.board,
      turn: isWinner || isDraw ? mark : (game.turn === "X" ? "O" : "X"),
      currentPlayer: isWinner || isDraw ? null : room.players[(game.currentPlayerIndex + 1) % room.players.length],
      currentPlayerIndex: isWinner || isDraw ? game.currentPlayerIndex : (game.currentPlayerIndex + 1) % room.players.length,
      history: game.history,
      lastMove: { x, y, mark, userId, username, nickname },
      message: `${nickname} đã đánh tại (${x}, ${y})`,
      timestamp: new Date().toISOString(),
      turnTimeLimit: turnTimeLimitForMove
    };

    io.to(roomIdStr).emit("move_made", lastMove);

    // Đợi một chút để đảm bảo client nhận được move_made trước
    await new Promise(resolve => setTimeout(resolve, 100));

    if (isWinner) {
      // Có người thắng
      gameResult = {
        winner: userId,
        winnerUsername: username,
        winnerNickname: nickname,
        winnerMark: mark,
        message: `${nickname} thắng!`,
        winningMove: { x, y }
      };

      // Tìm người thua TRƯỚC KHI gọi endGame (vì room có thể thay đổi sau đó)
      const loser = room.players.find(p => p.userId.toString() !== userId.toString());
      const loserNickname = loser?.nickname || loser?.username || "Đối thủ";
      const loserUserId = loser?.userId ? loser.userId.toString() : null;
      
      log("Game end - winner and loser", { 
        winnerId: userId.toString(), 
        winnerUsername: username,
        loserId: loserUserId, 
        loserUsername: loser?.username,
        allPlayers: room.players.map(p => ({ userId: p.userId.toString(), username: p.username }))
      });
      
      // Cập nhật trạng thái phòng
      await RoomService.endGame({ 
        roomId: roomIdStr, 
        result: gameResult 
      });

      // Cập nhật gameStats cho người thắng và thua - tách riêng để đảm bảo cả 2 đều được cập nhật
      if (userId) {
        try {
          log("Updating winner stats", { winnerId: userId.toString() });
          await UserService.updateGameStats(userId, "caro", true, false);
          log("Winner stats updated successfully");
        } catch (statsError) {
          log("updateGameStats error for winner", statsError.message);
          log("updateGameStats error stack", statsError.stack);
        }
      }
      if (loserUserId) {
        try {
          log("Updating loser stats", { loserId: loserUserId });
          await UserService.updateGameStats(loserUserId, "caro", false, false);
          log("Loser stats updated successfully");
        } catch (statsError) {
          log("updateGameStats error for loser", statsError.message);
          log("updateGameStats error stack", statsError.stack);
        }
      } else {
        log("WARNING: loserUserId is null/undefined, cannot update loser stats");
        log("Room players:", room.players.map(p => ({ userId: p.userId?.toString(), username: p.username })));
      }

      // Lưu lịch sử chơi vào database
      try {
        const boardSize = game.board.length;
        await GameCaroService.saveGameHistory({
          roomId: roomIdStr,
          gameState: game,
          result: gameResult,
          boardSize: boardSize,
          mode: 'P2P'
        });
        log("Game history saved successfully", { roomId: roomIdStr });
      } catch (historyError) {
        log("Error saving game history", historyError.message);
        // Không throw error để không ảnh hưởng đến flow chính
      }

      // Cập nhật gameResult với nickname
      gameResult.winnerNickname = nickname;
      gameResult.loserNickname = loserNickname;

      // Thông báo kết quả cho tất cả user trong phòng
      io.to(roomIdStr).emit("game_end", {
        result: gameResult,
        board: game.board,
        lastMove: { x, y, mark, userId, username, nickname },
        message: `${nickname} thắng!`,
        timestamp: new Date().toISOString()
      });

      // Cập nhật trạng thái phòng
      const roomAfter = await RoomService.getRoomById(roomIdStr);
      io.to(roomIdStr).emit("room_update", {
        room: roomAfter,
        message: "Game đã kết thúc",
        timestamp: new Date().toISOString()
      });

      // Cập nhật status = 'online' cho tất cả players
      await updatePlayersStatusToOnline(roomIdStr);

      // Dừng turn timer
      stopTurnTimer(roomIdStr);

      // Cleanup ping tracking cho tất cả players
      const { cleanupAllPingTracking } = require("../room");
      cleanupAllPingTracking(roomIdStr);

      // Giải phóng lock khi game kết thúc
      roomMoveLocks.delete(roomIdStr);

      log("Game ended - winner", { roomId: roomIdStr, winner: username });
      return;
    }

    if (isDraw) {
      gameResult = {
        winner: null,
        message: "Hòa!"
      };

      await RoomService.endGame({ 
        roomId: roomIdStr, 
        result: gameResult 
      });

      // Cập nhật gameStats cho cả 2 người chơi (hòa) - tách riêng để đảm bảo cả 2 đều được cập nhật
      for (const player of room.players) {
        if (player.userId) {
          try {
            await UserService.updateGameStats(player.userId, "caro", false, true);
          } catch (statsError) {
            log(`updateGameStats error for player ${player.userId} on draw`, statsError.message);
          }
        }
      }

      // Lưu lịch sử chơi vào database
      try {
        const boardSize = game.board.length;
        await GameCaroService.saveGameHistory({
          roomId: roomIdStr,
          gameState: game,
          result: gameResult,
          boardSize: boardSize,
          mode: 'P2P'
        });
        log("Game history saved successfully (draw)", { roomId: roomIdStr });
      } catch (historyError) {
        log("Error saving game history (draw)", historyError.message);
        // Không throw error để không ảnh hưởng đến flow chính
      }

      io.to(roomIdStr).emit("game_end", {
        result: gameResult,
        board: game.board,
        lastMove: { x, y, mark, userId, username, nickname },
        message: "Hòa!",
        timestamp: new Date().toISOString()
      });

      const roomAfter = await RoomService.getRoomById(roomIdStr);
      io.to(roomIdStr).emit("room_update", {
        room: roomAfter,
        message: "Game đã kết thúc (Hòa)",
        timestamp: new Date().toISOString()
      });

      // Cập nhật status = 'online' cho tất cả players
      await updatePlayersStatusToOnline(roomIdStr);

      // Dừng turn timer
      stopTurnTimer(roomIdStr);

      // Cleanup ping tracking cho tất cả players
      const { cleanupAllPingTracking } = require("../room");
      cleanupAllPingTracking(roomIdStr);

      // 🔓 Giải phóng lock khi game kết thúc
      roomMoveLocks.delete(roomIdStr);

      log("Game ended - draw", { roomId: roomIdStr });
      return;
    }

    // Đổi lượt (nếu không thắng và không hòa)
    // Dừng timer của lượt hiện tại
    stopTurnTimer(roomIdStr);
    
    // Cập nhật turn và turnStartTime TRƯỚC khi emit move_made để client có thể tính toán đúng
    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % room.players.length;
    game.turn = game.turn === "X" ? "O" : "X";
    const turnTimeLimit = room.turnTimeLimit || 30;
    game.turnStartTime = Date.now();

    // Bắt đầu timer cho lượt mới
    startTurnTimer(io, roomIdStr, turnTimeLimit);
    
    // Emit lại move_made với turnStartTime để client đồng bộ timer
    const turnStartTime = game.turnStartTime;
    io.to(roomIdStr).emit("turn_started", {
      turnStartTime: turnStartTime,
      turnTimeLimit: turnTimeLimit,
      currentPlayerIndex: game.currentPlayerIndex,
      turn: game.turn,
      timestamp: new Date().toISOString()
    });

    // Giải phóng lock sau khi hoàn thành
    roomMoveLocks.delete(roomIdStr);

    log("Move made successfully", { roomId: roomIdStr, x, y, mark, nextTurn: game.turn });

  } catch (err) {
    log("make_move error", err.message);
    
    // Giải phóng lock khi có lỗi
    roomMoveLocks.delete(roomIdStr);
    
    // Cố gắng rollback nếu có thể
    try {
      const room = await RoomService.getRoomById(roomIdStr);
      if (room && room.status === "playing") {
        const game = getGameState(roomIdStr);
        // Emit game state để đồng bộ client
        emitGameStateSync(io, roomIdStr, room, game, "Đã xảy ra lỗi, vui lòng thử lại");
      }
    } catch (syncError) {
      log("Error syncing game state after error", syncError.message);
    }
    
    socket.emit("move_error", { message: err.message });
  }
}

/** ----------------- UNDO MOVE (chỉ vs Bot hoặc khi được phép) ----------------- */
async function handleUndoMove(io, socket, data) {
  const { roomId } = data;
  const userId = socket.user._id;
  const username = socket.user.username;
  const nickname = socket.user.nickname || socket.user.username;
  const roomIdStr = roomId.toString();

  log("undo_move", { roomId: roomIdStr, userId, username, nickname });

  try {
    const room = await RoomService.getRoomById(roomIdStr);
    if (!room) {
      socket.emit("undo_error", { message: "Phòng không tồn tại" });
      return;
    }

    if (room.status !== "playing") {
      socket.emit("undo_error", { message: "Game chưa bắt đầu hoặc đã kết thúc" });
      return;
    }

    const game = roomGames[roomIdStr];
    if (!game || game.history.length === 0) {
      socket.emit("undo_error", { message: "Không có nước đi để hoàn tác" });
      return;
    }

    // Kiểm tra quyền: chỉ cho phép undo nước đi của chính mình hoặc nếu là host
    const isHost = room.hostId?.toString() === userId.toString();
    const lastMove = game.history[game.history.length - 1];
    
    // Nếu không phải host và nước đi cuối không phải của mình, không cho phép
    if (!isHost && lastMove.userId.toString() !== userId.toString()) {
      socket.emit("undo_error", { message: "Bạn chỉ có thể hoàn tác nước đi của chính mình" });
      return;
    }

    // Xóa nước đi cuối (hoặc 2 nước nếu vs Bot)
    const movesToUndo = room.players.length === 1 ? 2 : 1; // Nếu 1 player (vs Bot) thì undo 2 nước
    
    if (game.history.length < movesToUndo) {
      socket.emit("undo_error", { message: "Không đủ nước đi để hoàn tác" });
      return;
    }

    const undoneMoves = [];
    for (let i = 0; i < movesToUndo; i++) {
      const move = game.history.pop();
      undoneMoves.push(move);
      game.board[move.x][move.y] = null;
    }

    // Đổi lại lượt
    game.currentPlayerIndex = (game.currentPlayerIndex - movesToUndo + room.players.length) % room.players.length;
    game.turn = game.turn === "X" ? "O" : "X";

    // Thông báo cho tất cả user trong phòng
    io.to(roomIdStr).emit("move_undone", {
      board: game.board,
      turn: game.turn,
      currentPlayer: room.players[game.currentPlayerIndex],
      currentPlayerIndex: game.currentPlayerIndex,
      undoneMoves: undoneMoves,
      history: game.history,
      message: `${nickname} đã hoàn tác ${movesToUndo} nước đi`,
      timestamp: new Date().toISOString()
    });

    log("Move undone", { roomId: roomIdStr, movesUndone: movesToUndo });

  } catch (err) {
    log("undo_move error", err.message);
    socket.emit("undo_error", { message: err.message });
  }
}

/** ----------------- RESET GAME (chỉ owner) ----------------- */
async function handleResetGame(io, socket, data) {
  const { roomId } = data;
  const userId = socket.user._id;
  const username = socket.user.username;
  const nickname = socket.user.nickname || socket.user.username;
  const roomIdStr = roomId.toString();

  log("reset_game", { roomId: roomIdStr, userId, username, nickname });

  try {
    const room = await RoomService.getRoomById(roomIdStr);
    if (!room) {
      socket.emit("reset_error", { message: "Phòng không tồn tại" });
      return;
    }

    if (room.hostId?.toString() !== userId.toString()) {
      socket.emit("reset_error", { message: "Chỉ chủ phòng mới có thể reset game" });
      return;
    }

    // 🔓 Giải phóng lock nếu có (để reset game có thể thực hiện ngay cả khi đang xử lý move)
    roomMoveLocks.delete(roomIdStr);
    
    // Dừng turn timer
    stopTurnTimer(roomIdStr);

    // Reset game state
    roomGames[roomIdStr] = { 
      board: initBoard(), 
      turn: "X", 
      history: [],
      currentPlayerIndex: 0
    };

    // Cập nhật trạng thái phòng về waiting và reset ready status
    const updatedPlayers = room.players.map(p => ({ ...p, isReady: false }));
    await RoomService.updateRoom(roomIdStr, { 
      status: "waiting",
      players: updatedPlayers
    });
    const roomAfter = await RoomService.getRoomById(roomIdStr);

    // Thông báo cho tất cả user trong phòng
    io.to(roomIdStr).emit("game_reset", {
      board: roomGames[roomIdStr].board,
      turn: "X",
      currentPlayerIndex: 0,
      currentPlayer: roomAfter.players[0],
      room: roomAfter,
      message: `${nickname} đã reset game`,
      timestamp: new Date().toISOString()
    });

    io.to(roomIdStr).emit("room_update", {
      room: roomAfter,
      message: "Game đã được reset",
      timestamp: new Date().toISOString()
    });

    log("Game reset", { roomId: roomIdStr });

  } catch (err) {
    log("reset_game error", err.message);
    socket.emit("reset_error", { message: err.message });
  }
}

/** ----------------- CLEANUP LOCK ----------------- */
function cleanupMoveLock(roomIdStr) {
  roomMoveLocks.delete(roomIdStr);
}

module.exports = {
  handleMakeMove,
  handleUndoMove,
  handleResetGame,
  cleanupMoveLock
};
