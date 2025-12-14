// user.controller.js - xử lý request thông tin người dùng

const response = require("../utils/response");
const userService = require("../services/user.service");
const gameCaroService = require("../services/gameCaro.service");
const logger = require("../utils/logger");

// Lấy profile của chính người dùng đang đăng nhập
async function getProfile(req, res) {
  try {
    const user = await userService.getUserProfileFull(req.user._id);

    if (!user) return response.error(res, "Không tìm thấy người dùng", 404);

    return response.success(res, user, "Lấy thông tin profile thành công");
  } catch (err) {
    logger.error(`Lỗi khi lấy profile: ${err}`);
    return response.error(res, err.message, 500);
  }
}

// Cập nhật profile
async function updateProfile(req, res) {
  try {
    const updatedUser = await userService.updateUserProfile(req.user._id, req.body);

    if (!updatedUser)
      return response.error(res, "Cập nhật thất bại", 400);

    return response.success(res, updatedUser, "Cập nhật profile thành công");
  } catch (err) {
    logger.error(`Lỗi khi cập nhật profile: ${err}`);
    return response.error(res, err.message, 400);
  }
}

// Lấy profile của một user khác
async function getUserProfile(req, res) {
  try {
    const { userId } = req.params;
    const user = await userService.getUserProfile(userId);

    if (!user) return response.error(res, "Không tìm thấy người dùng", 404);

    return response.success(res, user, "Lấy thông tin người dùng thành công");
  } catch (err) {
    logger.error(`Lỗi khi lấy profile người dùng: ${err}`);
    return response.error(res, err.message, 500);
  }
}

// Lấy bảng xếp hạng
async function getLeaderboard(req, res) {
  try {
    const users = await userService.getLeaderboard(req.query.gameId);
    return response.success(res, users, "Get leaderboard success");
  } catch (err) {
    logger.error(`Lỗi khi lấy bảng xếp hạng: ${err}`);
    return response.error(res, err.message, 500);
  }
}

// Đổi mật khẩu
async function changePassword(req, res) {
  try {
    const result = await userService.changePassword(req.user._id, req.body);
    return response.success(res, result, result.message || "Đổi mật khẩu thành công");
  } catch (err) {
    logger.error(`Lỗi khi đổi mật khẩu: ${err}`);
    return response.error(res, err.message, 400);
  }
}

// Lấy lịch sử chơi của người dùng
async function getGameHistory(req, res) {
  try {
    const userId = req.user._id;
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;

    const games = await gameCaroService.getUserGameHistory(userId, { limit, skip });
    const total = await gameCaroService.getUserGameCount(userId);

    return response.success(res, {
      games,
      total,
      limit,
      skip
    }, "Lấy lịch sử chơi thành công");
  } catch (err) {
    logger.error(`Lỗi khi lấy lịch sử chơi: ${err}`);
    return response.error(res, err.message, 500);
  }
}

// Lấy lịch sử chơi của một user khác
async function getUserGameHistory(req, res) {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit) || 20;
    const skip = parseInt(req.query.skip) || 0;

    const games = await gameCaroService.getUserGameHistory(userId, { limit, skip });
    const total = await gameCaroService.getUserGameCount(userId);

    return response.success(res, {
      games,
      total,
      limit,
      skip
    }, "Lấy lịch sử chơi thành công");
  } catch (err) {
    logger.error(`Lỗi khi lấy lịch sử chơi của người dùng: ${err}`);
    return response.error(res, err.message, 500);
  }
}

// Lấy chi tiết một game theo ID
async function getGameDetail(req, res) {
  try {
    const { gameId } = req.params;
    const game = await gameCaroService.getGameById(gameId);

    return response.success(res, game, "Lấy chi tiết game thành công");
  } catch (err) {
    logger.error(`Lỗi khi lấy chi tiết game: ${err}`);
    return response.error(res, err.message, 500);
  }
}

module.exports = {
  getProfile,
  getUserProfile,
  updateProfile,
  getLeaderboard,
  changePassword,
  getGameHistory,
  getUserGameHistory,
  getGameDetail,
};
