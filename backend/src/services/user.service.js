// user.service.js

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/user.model");
const { checkData, checkNickname, hashPassword } = require("../utils/validation");
const logger = require("../utils/logger");

// Lấy profile của user (không có password, username, email, resetPasswordCode)
const getUserProfile = async (userId) => {
  try {
    const user = await User.findById(userId).select("-passwordHash -username -email -resetPasswordCode -resetPasswordCodeExpires");
    if (!user) {
      logger.warn(`Không tìm thấy người dùng: ${userId}`);
      throw new Error("Không tìm thấy người dùng");
    }
    logger.info(`Đã lấy thông tin profile cho người dùng: ${userId}`);
    return user;
  } catch (err) {
    logger.error("Lỗi khi lấy profile người dùng: %o", err);
    throw err;
  }
};

// Lấy profile đầy đủ - chỉ dùng cho chính user đó (không trả về username, email, resetPasswordCode để bảo mật)
const getUserProfileFull = async (userId) => {
  try {
    const user = await User.findById(userId).select("-passwordHash -username -email -resetPasswordCode -resetPasswordCodeExpires");
    if (!user) {
      logger.warn(`Không tìm thấy người dùng: ${userId}`);
      throw new Error("Không tìm thấy người dùng");
    }
    logger.info(`Đã lấy thông tin profile đầy đủ cho người dùng: ${userId}`);
    return user;
  } catch (err) {
    logger.error("Lỗi khi lấy profile đầy đủ người dùng: %o", err);
    throw err;
  }
};

// Cập nhật profile (nickname, avatarUrl, password - tất cả optional)
const updateUserProfile = async (userId, { nickname, avatarUrl, password } = {}) => {
  try {
    const updateData = {};

    if (nickname) {
      const trimmedNickname = nickname.trim();
      const nickCheck = checkNickname(trimmedNickname, 5, 15);
      if (!nickCheck.valid) throw new Error(nickCheck.message);

      const existingNickname = await User.findOne({ nickname: trimmedNickname });
      if (existingNickname && existingNickname._id.toString() !== String(userId)) {
        throw new Error("Nickname đã tồn tại.");
      }
      updateData.nickname = trimmedNickname;
    }

    if (avatarUrl) updateData.avatarUrl = avatarUrl;

    if (password) {
      const passCheck = checkData(password, 8, 20);
      if (!passCheck.valid) throw new Error(passCheck.message);
      updateData.passwordHash = await hashPassword(password);
    }

    if (Object.keys(updateData).length === 0) {
      logger.info(`Không cần cập nhật cho người dùng: ${userId}`);
      return await User.findById(userId).select("-passwordHash -username -email -resetPasswordCode -resetPasswordCodeExpires");
    }

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select("-passwordHash -username -email -resetPasswordCode -resetPasswordCodeExpires");
    logger.info(`Đã cập nhật profile cho người dùng: ${userId}`);
    return user;
  } catch (err) {
    logger.error("Lỗi khi cập nhật profile người dùng: %o", err);
    throw err;
  }
};

// Lấy bảng xếp hạng theo gameId
const getLeaderboard = async (gameId = "caro") => {
  try {
    const pipeline = [
      { $unwind: "$gameStats" },
      { $match: { "gameStats.gameId": gameId } },
      { $project: { nickname: 1, avatarUrl: 1, score: "$gameStats.score" } },
      { $sort: { score: -1 } },
      { $limit: 20 }
    ];

    const users = await User.aggregate(pipeline);
    logger.info(`Đã lấy bảng xếp hạng cho gameId: ${gameId}`);
    return users;
  } catch (err) {
    logger.error("Lỗi khi lấy bảng xếp hạng: %o", err);
    throw err;
  }
};

// Cập nhật gameStats khi game kết thúc
const updateGameStats = async (userId, gameId = "caro", isWin, isDraw = false) => {
  try {
    let userObjectId = userId;
    if (typeof userId === 'string' && mongoose.Types.ObjectId.isValid(userId)) {
      userObjectId = new mongoose.Types.ObjectId(userId);
    }

    const user = await User.findById(userObjectId);
    if (!user) {
      logger.warn(`Không tìm thấy người dùng để cập nhật thống kê: ${userId}`);
      return;
    }

    let gameStat = user.gameStats.find(s => s.gameId === gameId);
    let newTotalGames, newTotalWin, newTotalLose, newScore;
    
    if (!gameStat) {
      // Tạo gameStats mới
      newTotalGames = 1;
      newTotalWin = isWin ? 1 : 0;
      newTotalLose = (!isWin && !isDraw) ? 1 : 0;
      newScore = isDraw ? 1000 : (isWin ? 1020 : 990);
      
      await User.findByIdAndUpdate(
        userObjectId,
        {
          $push: {
            gameStats: {
              gameId: gameId,
              nameGame: "Cờ Caro",
              totalGames: newTotalGames,
              totalWin: newTotalWin,
              totalLose: newTotalLose,
              score: newScore
            }
          }
        },
        { new: true, runValidators: true }
      );
    } else {
      newTotalGames = gameStat.totalGames + 1;
      newTotalWin = isWin ? gameStat.totalWin + 1 : gameStat.totalWin;
      newTotalLose = (!isWin && !isDraw) ? gameStat.totalLose + 1 : gameStat.totalLose;
      
      if (isDraw) {
        newScore = gameStat.score;
      } else if (isWin) {
        newScore = gameStat.score + 20;
      } else {
        newScore = Math.max(0, gameStat.score - 10);
      }
      
      await User.updateOne(
        { _id: userObjectId, "gameStats.gameId": gameId },
        {
          $set: {
            "gameStats.$.totalGames": newTotalGames,
            "gameStats.$.totalWin": newTotalWin,
            "gameStats.$.totalLose": newTotalLose,
            "gameStats.$.score": newScore
          }
        },
        { runValidators: true }
      );
    }
    
    logger.info(`Đã cập nhật thống kê game cho người dùng ${userId}: ${isWin ? 'Thắng' : isDraw ? 'Hòa' : 'Thua'}`);
  } catch (err) {
    logger.error("Lỗi khi cập nhật thống kê game: %o", err);
    throw err;
  }
};

// Cập nhật trạng thái user
const updateUserStatus = async (userId, status) => {
  try {
    if (!userId || !status) {
      logger.warn(`Tham số không hợp lệ cho updateUserStatus: userId=${userId}, status=${status}`);
      return;
    }

    // Bỏ qua bot - bot không có user status
    const BotService = require("./bot.service");
    if (BotService.isBot(userId)) {
      return; // Bot không cần cập nhật status
    }

    const validStatuses = ["offline", "online", "in_game", "banned"];
    if (!validStatuses.includes(status)) {
      logger.warn(`Trạng thái không hợp lệ: ${status}`);
      return;
    }

    const updateData = { status: status };
    if (status === "online" || status === "in_game") {
      updateData.lastOnline = new Date();
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select("-passwordHash -username -email -resetPasswordCode -resetPasswordCodeExpires");

    if (!user) {
      logger.warn(`Không tìm thấy người dùng để cập nhật trạng thái: ${userId}`);
      return;
    }

    logger.info(`Đã cập nhật trạng thái người dùng: ${userId} -> ${status}`);
    return user;
  } catch (err) {
    logger.error("Lỗi khi cập nhật trạng thái người dùng: %o", err);
  }
};

// Đổi mật khẩu
const changePassword = async (userId, { currentPassword, newPassword }) => {
  try {
    if (!currentPassword || !newPassword) {
      throw new Error("Vui lòng nhập mật khẩu hiện tại và mật khẩu mới");
    }

    const passCheck = checkData(newPassword, 8, 20);
    if (!passCheck.valid) {
      throw new Error(passCheck.message || "Mật khẩu mới không hợp lệ (8-20 ký tự)");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error("Người dùng không tồn tại");
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new Error("Mật khẩu hiện tại không đúng");
    }

    const newPasswordHash = await hashPassword(newPassword);
    user.passwordHash = newPasswordHash;
    await user.save();

    logger.info(`Đã đổi mật khẩu cho người dùng: ${userId}`);
    return { success: true, message: "Đổi mật khẩu thành công" };
  } catch (err) {
    logger.error("Lỗi khi đổi mật khẩu: %o", err);
    throw err;
  }
};

module.exports = {
  getUserProfile,
  getUserProfileFull,
  updateUserProfile,
  getLeaderboard,
  updateGameStats,
  updateUserStatus,
  changePassword,
};
