// room.service.js
const Room = require("../models/room.model");
const User = require("../models/user.model");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const BotService = require("./bot.service");

// Chuyển room sang JSON và thêm thông tin ELO, nickname, avatarUrl
async function toJSON(room) {
  const roomObj = room.toObject({ getters: true });
  
  // Loại bỏ passwordHash khỏi response
  delete roomObj.passwordHash;
  
  if (roomObj.playerMarks) {
    if (roomObj.playerMarks instanceof Map) {
      roomObj.playerMarks = Object.fromEntries(roomObj.playerMarks);
    } else if (typeof roomObj.playerMarks === 'object' && roomObj.playerMarks.constructor === Object) {
    } else {
      roomObj.playerMarks = roomObj.playerMarks || {};
    }
  } else {
    roomObj.playerMarks = {};
  }
  
  if (roomObj.players && roomObj.players.length > 0) {
    const playersWithElo = await Promise.all(
      roomObj.players.map(async (player) => {
        // Nếu là bot, trả về thông tin bot không cần query database
        if (BotService.isBotPlayer(player)) {
          const { username, ...playerWithoutUsername } = player;
          const botInfo = BotService.getBotDisplayInfo();
          return {
            ...playerWithoutUsername,
            ...botInfo,
          };
        }
        
        // Nếu là user thật, query database
        const elo = await BotService.getUserElo(player.userId);
        const nickname = await BotService.getUserNickname(player.userId);
        const avatarUrl = await BotService.getUserAvatarUrl(player.userId);
        
        // Loại bỏ username khỏi player object
        const { username, ...playerWithoutUsername } = player;
        return {
          ...playerWithoutUsername,
          nickname: nickname,
          elo: elo,
          score: elo,
          avatarUrl: avatarUrl,
        };
      })
    );
    roomObj.players = playersWithElo;
  }
  
  return roomObj;
}
// Tạo phòng chơi mới
async function createRoom({ name, password, maxPlayers, hostId, hostUsername, turnTimeLimit, firstTurn, mode, botDifficulty }) {
  const passwordHash = password ? await bcrypt.hash(password, 10) : null;
  const defaultFirstTurn = firstTurn || 'X';
  const gameMode = mode || 'P2P';
  const botDiff = botDifficulty || 'medium';
  
  const players = [
    {
      userId: hostId,
      username: hostUsername,
      isHost: true,
      isReady: false,
      sessionId: uuidv4(),
      isDisconnected: false,
    },
  ];
  
  // Tạo player marks tùy theo mode
  let defaultPlayerMarks = {};
  if (gameMode === 'P2B') {
    // Nếu là chế độ chơi với bot (P2B), thêm bot vào players
    players.push(BotService.getBotPlayerObject());
    // Gán marks cho bot và host
    defaultPlayerMarks = BotService.createBotPlayerMarks(hostId, defaultFirstTurn);
  } else {
    // P2P mode: chỉ gán mark cho host
    defaultPlayerMarks[hostId.toString()] = 'X';
  }
  
  const room = await Room.create({
    name: name || `Phòng #${Math.floor(Math.random() * 10000)}`,
    passwordHash,
    hostId,
    maxPlayers: maxPlayers || 2,
    turnTimeLimit: turnTimeLimit || 30,
    firstTurn: defaultFirstTurn,
    playerMarks: defaultPlayerMarks,
    mode: gameMode,
    botDifficulty: gameMode === 'P2B' ? botDiff : undefined,
    players: players,
    status: "waiting",
  });
  console.log(`Đã tạo phòng mới với ID: ${room._id}, mode: ${gameMode}, playerMarks:`, defaultPlayerMarks);
  return toJSON(room);
}

// Tham gia vào phòng chơi
async function joinRoom({ roomId, password, userId, username }) {
  const room = await Room.findById(roomId);
  if (!room) throw new Error("Phòng không tồn tại");
  
  if (room.status === "ended") throw new Error("Phòng đã kết thúc");
  
  const existingPlayer = room.players.find((p) => p.userId.toString() === userId.toString());
  if (existingPlayer) {
    if (existingPlayer.isDisconnected) {
      existingPlayer.isDisconnected = false;
      existingPlayer.disconnectedAt = null;
      existingPlayer.sessionId = require("uuid").v4();
      await room.save();
    }
    if (!existingPlayer.isDisconnected) {
      existingPlayer.sessionId = require("uuid").v4();
      await room.save();
    }
    return toJSON(room);
  }
  
  const otherRoom = await findRoomByUserId(userId);
  if (otherRoom && otherRoom._id.toString() !== roomId.toString()) {
    await leaveAllOtherRooms(userId, roomId);
  }

  const isHost = room.hostId && room.hostId.toString() === userId.toString();
  if (!isHost && room.passwordHash && !(await bcrypt.compare(password || "", room.passwordHash))) {
    throw new Error("Sai mật khẩu");
  }
  
  if (room.players.length >= room.maxPlayers) throw new Error("Phòng đã đầy");
  const newPlayer = {
    userId,
    username,
    isHost: false,
    isReady: false,
    sessionId: uuidv4(),
    isDisconnected: false,
  };
  room.players.push(newPlayer);
  await room.save();
  
  if (room.players.length === 2) {
    const freshRoom = await Room.findById(roomId);
    const currentPlayerMarks = freshRoom.playerMarks instanceof Map 
      ? Object.fromEntries(freshRoom.playerMarks) 
      : (freshRoom.playerMarks || {});
    
    let needsUpdate = false;
    const updateData = {};
    
    const marksCount = Object.keys(currentPlayerMarks).filter(key => 
      currentPlayerMarks[key] === 'X' || currentPlayerMarks[key] === 'O'
    ).length;
    
    if (marksCount < 2) {
      const hostPlayer = freshRoom.players.find(p => p.isHost);
      const nonHostPlayer = freshRoom.players.find(p => !p.isHost);
      
      if (hostPlayer && nonHostPlayer) {
        const hostId = hostPlayer.userId.toString();
        const nonHostId = nonHostPlayer.userId.toString();
        
        if (!currentPlayerMarks[hostId] || currentPlayerMarks[hostId] !== 'X') {
          currentPlayerMarks[hostId] = 'X';
          needsUpdate = true;
        }
        if (!currentPlayerMarks[nonHostId] || currentPlayerMarks[nonHostId] !== 'O') {
          currentPlayerMarks[nonHostId] = 'O';
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          updateData.playerMarks = currentPlayerMarks;
          console.log(`Đã tự động khởi tạo playerMarks:`, currentPlayerMarks);
        }
      }
    }
    
    if (!freshRoom.firstTurn || (freshRoom.firstTurn !== 'X' && freshRoom.firstTurn !== 'O')) {
      updateData.firstTurn = 'X';
      needsUpdate = true;
      console.log(`Đã tự động khởi tạo firstTurn: X`);
    }
    
    if (needsUpdate) {
      await Room.findByIdAndUpdate(roomId, updateData);
      const updatedRoom = await Room.findById(roomId);
      return toJSON(updatedRoom);
    }
  }
  
  return toJSON(room);
}
// Rời khỏi phòng chơi
async function leaveRoom({ roomId, userId }) {
  const room = await Room.findById(roomId);
  if (!room) throw new Error("Phòng không tồn tại");
  
  const playerIndex = room.players.findIndex(p => p.userId.toString() === userId.toString());
  if (playerIndex === -1) throw new Error("Bạn không ở trong phòng này");
  
  // Nếu là phòng bot (P2B), xóa luôn phòng khi user rời
  if (room.mode === 'P2B') {
    await Room.findByIdAndDelete(room._id);
    return null;
  }
  
  const isHost = room.players[playerIndex].isHost;
  room.players.splice(playerIndex, 1);
  
  if (isHost && room.players.length > 0) {
    // Tìm human player đầu tiên (không phải bot) để làm host
    const humanPlayer = BotService.findFirstHumanPlayer(room.players);
    
    if (humanPlayer) {
      humanPlayer.isHost = true;
      room.hostId = humanPlayer.userId;
    } else {
      // Nếu không có human player nào, xóa phòng
      await Room.findByIdAndDelete(room._id);
      return null;
    }
  }
  
  if (room.players.length === 0) {
    await Room.findByIdAndDelete(room._id);
    return null;
  }
  
  await room.save();
  return toJSON(room);
}

// Cập nhật thông tin phòng
async function updateRoom(roomId, data) {
  const room = await Room.findById(roomId);
  if (!room) throw new Error("Không tìm thấy phòng");
  
  if (data.playerMarks !== undefined) {
    room.playerMarks = data.playerMarks;
  }
  if (data.turnTimeLimit !== undefined) {
    room.turnTimeLimit = data.turnTimeLimit;
  }
  if (data.firstTurn !== undefined) {
    room.firstTurn = data.firstTurn;
  }
  if (data.status !== undefined) {
    room.status = data.status;
  }
  if (data.players !== undefined) {
    room.players = data.players;
    // Đảm bảo bot luôn sẵn sàng
    room.players.forEach(player => {
      if (BotService.isBotPlayer(player)) {
        player.isReady = true;
      }
    });
  }
  
  await room.save();
  return toJSON(room);
}
// Bật/tắt trạng thái sẵn sàng
async function toggleReady({ roomId, isReady, userId }) {
  const room = await Room.findById(roomId);
  if (!room) throw new Error("Phòng không tồn tại");
  
  const player = room.players.find(p => p.userId.toString() === userId.toString());
  if (!player) throw new Error("Bạn không ở trong phòng này");
  
  if (player.isHost) {
    throw new Error("Chủ phòng không cần sẵn sàng");
  }
  
  // Bot luôn sẵn sàng, không cho phép thay đổi
  if (BotService.isBotPlayer(player)) {
    throw new Error("Bot luôn sẵn sàng");
  }
  
  player.isReady = isReady;
  
  // Đảm bảo bot luôn có isReady = true
  room.players.forEach(p => {
    if (BotService.isBotPlayer(p)) {
      p.isReady = true;
    }
  });
  
  const nonHostPlayers = room.players.filter(p => !p.isHost && !p.isDisconnected);
  const allNonHostReady = nonHostPlayers.length > 0 && nonHostPlayers.every(p => p.isReady);
  
  await room.save();
  return { room: await toJSON(room), started: false, allNonHostReady };
}

// Kết thúc trận đấu và reset phòng
async function endGame({ roomId, result }) {
  const room = await Room.findById(roomId);
  if (!room) throw new Error("Phòng không tồn tại");
  
  room.status = "waiting";
  if (result) room.result = result;
  
  // Reset ready status cho tất cả players, nhưng bot luôn sẵn sàng
  room.players.forEach(player => {
    if (BotService.isBotPlayer(player)) {
      player.isReady = true; // Bot luôn sẵn sàng
    } else {
      player.isReady = false;
    }
  });
  
  await room.save();
  return toJSON(room);
}

// Format phòng cho danh sách (chỉ lấy thông tin cần thiết)
async function formatRoomForList(room) {
  // Lưu thông tin hasPassword trước khi gọi toJSON (vì toJSON sẽ loại bỏ passwordHash)
  const hasPassword = !!room.passwordHash;
  const roomObj = await toJSON(room);
  
  // Chỉ trả về các trường cần thiết cho danh sách phòng
  return {
    _id: roomObj._id,
    name: roomObj.name,
    status: roomObj.status,
    maxPlayers: roomObj.maxPlayers,
    hostId: roomObj.hostId,
    hostNickname: roomObj.players?.find(p => p.isHost)?.nickname || null,
    hasPassword: hasPassword, // Chỉ trả về boolean, không trả về passwordHash
    players: roomObj.players?.map(player => ({
      userId: player.userId,
      nickname: player.nickname,
      isHost: player.isHost,
      isReady: player.isReady,
      elo: player.elo || player.score || 1000,
      avatarUrl: player.avatarUrl,
    })) || [],
    createdAt: roomObj.createdAt,
  };
}

// Lấy danh sách tất cả phòng
async function getAllRooms() {
  const rooms = await Room.find();
  return Promise.all(rooms.map(formatRoomForList));
}

// Lấy thông tin chi tiết phòng theo ID
async function getRoomById(roomId) {
  const room = await Room.findById(roomId);
  if (!room) throw new Error("Không tìm thấy phòng");
  return toJSON(room);
}

// Xác minh mật khẩu phòng
async function verifyPassword({ roomId, password, userId }) {
  const room = await Room.findById(roomId);
  if (!room) {
    console.error("Không tìm thấy phòng:", roomId);
    throw new Error("Phòng không tồn tại");
  }
  
  if (room.status === "ended") {
    console.error("Phòng đã kết thúc:", roomId);
    throw new Error("Phòng đã kết thúc");
  }
  
  // Chủ phòng không cần nhập mật khẩu
  if (userId && room.hostId && room.hostId.toString() === userId.toString()) {
    console.log("User là chủ phòng, bỏ qua kiểm tra mật khẩu");
    return { valid: true };
  }
  
  // Phòng không có mật khẩu thì luôn cho phép
  if (!room.passwordHash) {
    console.log("Phòng không có mật khẩu");
    return { valid: true };
  }
  
  const passwordToCheck = password || "";
  console.log("Đang so sánh mật khẩu:", { 
    providedLength: passwordToCheck.length, 
    hasRoomPassword: !!room.passwordHash 
  });
  
  const isValid = await bcrypt.compare(passwordToCheck, room.passwordHash);
  if (!isValid) {
    console.error("Mật khẩu không khớp");
    throw new Error("Sai mật khẩu");
  }
  
  console.log("Xác thực mật khẩu thành công");
  return { valid: true };
}

// Tìm phòng mà user đang tham gia
async function findRoomByUserId(userId) {
  const room = await Room.findOne({
    "players.userId": userId,
    status: { $in: ["waiting", "playing"] }
  });
  if (!room) return null;
  return toJSON(room);
}

// Rời khỏi tất cả phòng khác của user
async function leaveAllOtherRooms(userId, currentRoomId) {
  const rooms = await Room.find({
    "players.userId": userId,
    _id: { $ne: currentRoomId },
    status: { $in: ["waiting", "playing"] }
  });

  for (const room of rooms) {
    try {
      await leaveRoom({ roomId: room._id.toString(), userId });
    } catch (err) {
      console.error(`Lỗi khi rời phòng ${room._id}:`, err.message);
    }
  }
}

// Đánh dấu người chơi đã ngắt kết nối
async function markPlayerDisconnected({ roomId, userId }) {
  const room = await Room.findById(roomId);
  if (!room) return null;
  const player = room.players.find(p => p.userId.toString() === userId.toString());
  if (player) {
    player.isDisconnected = true;
    player.disconnectedAt = new Date();
    await room.save();
  }
  return toJSON(room);
}

// Đánh dấu người chơi đã kết nối lại
async function markPlayerReconnected({ roomId, userId, sessionId }) {
  const room = await Room.findById(roomId);
  if (!room) return null;
  const player = room.players.find(p => p.userId.toString() === userId.toString());
  if (player) {
    player.isDisconnected = false;
    player.disconnectedAt = null;
    player.sessionId = sessionId;
    await room.save();
  }
  return toJSON(room);
}

// Xóa người chơi khỏi phòng sau khi hết thời gian chờ
async function removeDisconnectedPlayer({ roomId, userId }) {
  const room = await Room.findById(roomId);
  if (!room) return null;
  const playerIndex = room.players.findIndex(p => p.userId.toString() === userId.toString());
  if (playerIndex === -1) return toJSON(room);
  
  // Nếu là phòng bot (P2B), xóa luôn phòng khi user bị remove
  if (room.mode === 'P2B') {
    await Room.findByIdAndDelete(room._id);
    return null;
  }
  
  const isHost = room.players[playerIndex].isHost;
  room.players.splice(playerIndex, 1);
  
  if (isHost && room.players.length > 0) {
    // Tìm human player đầu tiên (không phải bot) để làm host
    const humanPlayer = BotService.findFirstHumanPlayer(room.players);
    
    if (humanPlayer) {
      humanPlayer.isHost = true;
      room.hostId = humanPlayer.userId;
    } else {
      // Nếu không có human player nào, xóa phòng
      await Room.findByIdAndDelete(room._id);
      return null;
    }
  }
  
  if (room.players.length === 0) {
    await Room.findByIdAndDelete(room._id);
    return null;
  }
  
  await room.save();
  return toJSON(room);
}

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  updateRoom,
  toggleReady,
  endGame,
  getAllRooms,
  getRoomById,
  findRoomByUserId,
  verifyPassword,
  markPlayerDisconnected,
  markPlayerReconnected,
  removeDisconnectedPlayer,
  leaveAllOtherRooms,
};