// room.controller.js - xử lý request phòng chơi
const RoomService = require("../services/room.service");
const response = require("../utils/response");
const logger = require("../utils/logger");

// Tạo phòng chơi mới
async function createRoom(req, res) {
  try {
    const userId = req.user._id;
    
    const existingRoom = await RoomService.findRoomByUserId(userId);
    if (existingRoom) {
      logger.info(`User ${userId} đã có phòng ${existingRoom._id}, trả về phòng hiện tại`);
      return response.success(res, existingRoom, "Bạn đang ở trong phòng này", 200);
    }
    
    const { name, password, turnTimeLimit } = req.body;
    const room = await RoomService.createRoom({
      name,
      password,
      maxPlayers: 2,
      turnTimeLimit,
      hostId: userId,
      hostUsername: req.user.username || req.user.nickname,
    });
    logger.info(`Tạo phòng ${room._id}`);
    return response.success(res, room, "Tạo phòng thành công", 201);
  } catch (err) {
    logger.error("createRoom error: %o", err);
    return response.error(res, err.message, 400);
  }
}

// Tham gia vào một phòng chơi có sẵn
async function joinRoom(req, res) {
  try {
    const { roomId, password } = req.body;
    const room = await RoomService.joinRoom({
      roomId,
      password,
      userId: req.user._id,
      username: req.user.username,
    });

    req.io.to(room._id.toString()).emit("room:update", room);
    return response.success(res, room, "Tham gia phòng thành công");
  } catch (err) {
    logger.warn("joinRoom failed: %o", err.message);
    return response.error(res, err.message, 400);
  }
}

// Rời khỏi phòng chơi hiện tại
async function leaveRoom(req, res) {
  try {
    const { roomId } = req.body;
    const room = await RoomService.leaveRoom({
      roomId,
      userId: req.user._id,
    });

    if (!room) {
      // Phòng đã bị xóa vì không còn người chơi nào
      return response.success(res, {}, "Bạn đã rời phòng -> Phòng đã bị xóa");
    }
    return response.success(res, room, "Rời phòng thành công");
  } catch (err) {
    logger.error("leaveRoom error: %o", err);
    return response.error(res, err.message, 400);
  }
}

// Cập nhật thông tin phòng
async function updateRoom(req, res) {
  try {
    const { roomId, data } = req.body;
    const room = await RoomService.updateRoom(roomId, data);
    return response.success(res, room, "Cập nhật phòng thành công");
  } catch (err) {
    logger.error("updateRoom error: %o", err);
    return response.error(res, err.message, 400);
  }
}

// Bật/tắt trạng thái sẵn sàng
async function toggleReady(req, res) {
  try {
    const { roomId, isReady } = req.body;
    const { room, started } = await RoomService.toggleReady({
      roomId,
      isReady,
      userId: req.user._id,
    });

    if (started) req.io.to(room._id.toString()).emit("room:start", room);

    return response.success(res, room, "Cập nhật trạng thái thành công");
  } catch (err) {
    logger.error("toggleReady error: %o", err);
    return response.error(res, err.message, 400);
  }
}

// Kết thúc trận đấu và cập nhật kết quả
async function endGame(req, res) {
  try {
    const { roomId, result } = req.body;
    const room = await RoomService.endGame({ roomId, result });

    req.io.to(room._id.toString()).emit("room:end", { result, room });
    return response.success(res, room, "Trận đấu kết thúc");
  } catch (err) {
    logger.error("endGame error: %o", err);
    return response.error(res, err.message, 400);
  }
}

// Lấy danh sách tất cả các phòng đang có
async function getRoomList(req, res) {
  try {
    const rooms = await RoomService.getAllRooms();
    return response.success(res, rooms, "Danh sách phòng");
  } catch (err) {
    logger.error("getRooms error: %o", err);
    return response.error(res, err.message, 400);
  }
}

// Kiểm tra user có đang ở trong phòng nào không
async function checkUserRoom(req, res) {
  try {
    const userId = req.user._id;
    const room = await RoomService.findRoomByUserId(userId);
    
    if (!room) {
      return response.success(res, { inRoom: false, room: null }, "User không đang ở trong phòng nào");
    }
    
    return response.success(res, { inRoom: true, room }, "User đang ở trong phòng");
  } catch (err) {
    logger.error("checkUserRoom error: %o", err);
    return response.error(res, err.message, 400);
  }
}

// Xác minh mật khẩu phòng
async function verifyPassword(req, res) {
  try {
    const { roomId, password } = req.body;
    const userId = req.user._id;
    logger.info("verifyPassword request:", { roomId, hasPassword: !!password, passwordLength: password?.length, userId });
    
    if (!roomId) {
      logger.warn("verifyPassword: roomId is missing");
      return response.error(res, "Thiếu roomId", 400);
    }
    
    const result = await RoomService.verifyPassword({ roomId, password, userId });
    logger.info("verifyPassword success:", { roomId });
    return response.success(res, result, "Mật khẩu đúng");
  } catch (err) {
    logger.warn("verifyPassword failed: %o", err.message);
    return response.error(res, err.message, 400);
  }
}

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  updateRoom,
  toggleReady,
  endGame,
  getRoomList,
  checkUserRoom,
  verifyPassword,
};
