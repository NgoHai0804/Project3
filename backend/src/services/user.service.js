// user.service.js - xử lý logic quản lý người dùng

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/user.model");
const { checkData, checkNickname, hashPassword } = require("../utils/validation");
const logger = require("../utils/logger");

// Lấy profile của user (không có password, username, email)
const getUserProfile = async (userId) => {
  try {
    const user = await User.findById(userId).select("-passwordHash -username -email");
    if (!user) {
      logger.warn(`User not found: ${userId}`);
      throw new Error("Không tìm thấy người dùng");
    }
    logger.info(`Fetched profile for user: ${userId}`);
    return user;
  } catch (err) {
    logger.error("getUserProfile error: %o", err);
    throw err;
  }
};

// Lấy profile đầy đủ (có username, email) - chỉ dùng cho chính user đó
const getUserProfileFull = async (userId) => {
  try {
    const user = await User.findById(userId).select("-passwordHash");
    if (!user) {
      logger.warn(`User not found: ${userId}`);
      throw new Error("Không tìm thấy người dùng");
    }
    logger.info(`Fetched full profile for user: ${userId}`);
    return user;
  } catch (err) {
    logger.error("getUserProfileFull error: %o", err);
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
      logger.info(`No update needed for user: ${userId}`);
      return await User.findById(userId).select("-passwordHash -username -email");
    }

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true }).select("-passwordHash -username -email");
    logger.info(`Updated profile for user: ${userId}`);
    return user;
  } catch (err) {
    logger.error("updateUserProfile error: %o", err);
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
    logger.info(`Fetched leaderboard for gameId: ${gameId}`);
    return users;
  } catch (err) {
    logger.error("getLeaderboard error: %o", err);
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
      logger.warn(`User not found for stats update: ${userId}`);
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
    
    logger.info(`Updated game stats for user ${userId}: ${isWin ? 'Win' : isDraw ? 'Draw' : 'Lose'}`);
  } catch (err) {
    logger.error("updateGameStats error: %o", err);
    throw err;
  }
};

// Cập nhật trạng thái user
const updateUserStatus = async (userId, status) => {
  try {
    if (!userId || !status) {
      logger.warn(`Invalid params for updateUserStatus: userId=${userId}, status=${status}`);
      return;
    }

    const validStatuses = ["offline", "online", "in_game", "banned"];
    if (!validStatuses.includes(status)) {
      logger.warn(`Invalid status: ${status}`);
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
    ).select("-passwordHash -username -email");

    if (!user) {
      logger.warn(`User not found for status update: ${userId}`);
      return;
    }

    logger.info(`Updated user status: ${userId} -> ${status}`);
    return user;
  } catch (err) {
    logger.error("updateUserStatus error: %o", err);
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

    logger.info(`Password changed for user: ${userId}`);
    return { success: true, message: "Đổi mật khẩu thành công" };
  } catch (err) {
    logger.error("changePassword error: %o", err);
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
