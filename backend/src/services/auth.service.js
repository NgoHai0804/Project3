// auth.service.js - xử lý logic xác thực người dùng

const bcrypt = require("bcryptjs");
const User = require("../models/user.model");
const { signToken, signRefreshToken, verifyRefreshToken } = require("../utils/jwt");
const { checkData, hashPassword } = require("../utils/validation");
const logger = require("../utils/logger");
const { sendPasswordResetEmail } = require("./email.service");

async function register({ username, password, nickname, email }) {
  try {
    if (!checkData(username, 5, 15)) 
      return { error: "Username is not valid (5-15 chars)", code: 400 };
    if (!checkData(password, 8, 20)) 
      return { error: "Password is not valid (8-20 chars)", code: 400 };
    if (!checkData(nickname, 5, 15)) 
      return { error: "Nickname is not valid (5-15 chars)", code: 400 };

    if (!email || !email.trim()) {
      return { error: "Email is required", code: 400 };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return { error: "Invalid email format", code: 400 };
    }

    const existingUserByUsername = await User.findOne({ username });
    if (existingUserByUsername) 
      return { error: "Username already exists", code: 409 };

    const existingUserByNickname = await User.findOne({ nickname });
    if (existingUserByNickname) 
      return { error: "Nickname already exists", code: 409 };

    const normalizedEmail = email.trim().toLowerCase();
    const existingUserByEmail = await User.findOne({ email: normalizedEmail });
    if (existingUserByEmail) 
      return { error: "Email already exists", code: 409 };

    const passwordHash = await hashPassword(password);
    const user = await User.create({ 
      username, 
      passwordHash, 
      nickname, 
      email: normalizedEmail 
    });

    const token = signToken(user);
    const refreshToken = signRefreshToken(user);
    logger.info(`Người dùng đã đăng ký thành công: ${username} (${user._id})`);
    return { 
      data: { 
        id: user._id, 
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        token: token,
        refreshToken: refreshToken,
      } 
    };
  } catch (err) {
    logger.error(`Đăng ký thất bại: ${err.message}`);
    return { error: err.message };
  }
}


async function login({ username, password }) {
  try {
    if (!username || !password) {
      return { error: "Please provide both username and password", code: 400 };
    }

    const user = await User.findOne({ username });
    if (!user) {
      return { error: "Tên đăng nhập hoặc mật khẩu không đúng", code: 401 };
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return { error: "Tên đăng nhập hoặc mật khẩu không đúng", code: 401 };
    }

    const token = signToken(user);
    const refreshToken = signRefreshToken(user);
    logger.info(`Người dùng đã đăng nhập: ${username} (${user._id})`);

    return {
      data: {
        token,
        refreshToken,
        id: user._id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      },
    };
  } catch (err) {
    logger.error(`Đăng nhập thất bại cho tên đăng nhập "${username}": ${err.message}`);
    throw err;
  }
}

// Tạo mật khẩu ngẫu nhiên
function generateRandomPassword(length = 12) {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

// Tạo mã xác nhận 6 số ngẫu nhiên
function generateResetCode() {
  // Tạo số ngẫu nhiên từ 100000 đến 999999 (luôn có 6 chữ số)
  const min = 100000;
  const max = 999999;
  const code = Math.floor(Math.random() * (max - min + 1)) + min;
  // Đảm bảo luôn là string có 6 chữ số
  return code.toString();
}

// Xử lý quên mật khẩu - tạo mã 6 số và gửi email
async function forgotPassword({ email }) {
  try {
    if (!email || !email.trim()) {
      return { error: "Email is required", code: 400 };
    }

    // Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { error: "Invalid email format", code: 400 };
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    
    if (!user) {
      logger.warn(`Yêu cầu quên mật khẩu cho email không tồn tại: ${email}`);
      // Vẫn trả về success để không tiết lộ email có tồn tại hay không
      return {
        data: {
          message: "If the email exists, a verification code has been sent to your email.",
        },
      };
    }

    // Tạo mã 6 số và lưu vào user với thời gian hết hạn 15 phút
    const resetCode = generateResetCode();
    // Đảm bảo mã là đúng 6 chữ số
    if (!/^\d{6}$/.test(resetCode)) {
      logger.error(`Mã xác nhận được tạo không hợp lệ: ${resetCode}`);
      return { error: "Failed to generate verification code", code: 500 };
    }
    user.resetPasswordCode = resetCode;
    user.resetPasswordCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút
    await user.save();

    try {
      await sendPasswordResetEmail(user.email, resetCode, user.username);
      logger.info(`Đã gửi mã xác nhận khôi phục mật khẩu thành công đến ${user.email} cho người dùng ${user.username}`);
    } catch (emailError) {
      logger.error(`Gửi email khôi phục mật khẩu thất bại: ${emailError.message}`);
      // Xóa mã nếu gửi email thất bại
      user.resetPasswordCode = undefined;
      user.resetPasswordCodeExpires = undefined;
      await user.save();
      throw new Error("Failed to send email. Please try again later.");
    }

    return {
      data: {
        message: "A verification code has been sent to your email.",
      },
    };
  } catch (err) {
    logger.error(`Quên mật khẩu thất bại cho email "${email}": ${err.message}`);
    return { error: err.message || "Internal server error", code: 500 };
  }
}

// Xử lý reset mật khẩu với mã xác nhận
async function resetPassword({ email, code, newPassword }) {
  try {
    if (!email || !email.trim()) {
      return { error: "Email is required", code: 400 };
    }

    if (!code || !code.trim()) {
      return { error: "Verification code is required", code: 400 };
    }

    if (!newPassword) {
      return { error: "New password is required", code: 400 };
    }

    // Kiểm tra định dạng email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return { error: "Invalid email format", code: 400 };
    }

    // Kiểm tra định dạng mã (6 số)
    if (!/^\d{6}$/.test(code.trim())) {
      return { error: "Invalid verification code format", code: 400 };
    }

    // Kiểm tra mật khẩu mới
    if (!checkData(newPassword, 8, 20)) {
      return { error: "Password is not valid (8-20 chars)", code: 400 };
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    
    if (!user) {
      return { error: "User not found", code: 404 };
    }

    // Kiểm tra mã xác nhận
    if (!user.resetPasswordCode) {
      return { error: "No reset code found. Please request a new code.", code: 400 };
    }

    if (user.resetPasswordCode !== code.trim()) {
      return { error: "Invalid verification code", code: 400 };
    }

    // Kiểm tra mã có hết hạn không
    if (!user.resetPasswordCodeExpires || new Date() > user.resetPasswordCodeExpires) {
      user.resetPasswordCode = undefined;
      user.resetPasswordCodeExpires = undefined;
      await user.save();
      return { error: "Verification code has expired. Please request a new code.", code: 400 };
    }

    // Đổi mật khẩu
    const passwordHash = await hashPassword(newPassword);
    user.passwordHash = passwordHash;
    user.resetPasswordCode = undefined;
    user.resetPasswordCodeExpires = undefined;
    await user.save();

    logger.info(`Đặt lại mật khẩu thành công cho người dùng ${user.username} (${user._id})`);

    return {
      data: {
        message: "Password has been reset successfully.",
      },
    };
  } catch (err) {
    logger.error(`Đặt lại mật khẩu thất bại cho email "${email}": ${err.message}`);
    return { error: err.message || "Internal server error", code: 500 };
  }
}

// Refresh access token bằng refresh token
async function refreshToken(refreshToken) {
  try {
    if (!refreshToken) {
      return { error: "Refresh token is required", code: 400 };
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      logger.warn(`Refresh token không hợp lệ: ${err.message}`);
      return { error: "Invalid or expired refresh token", code: 401 };
    }

    if (decoded.type !== 'refresh') {
      return { error: "Invalid token type", code: 401 };
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return { error: "User not found", code: 404 };
    }

    const newToken = signToken(user);
    logger.info(`Đã làm mới token cho người dùng: ${user.username} (${user._id})`);

    return {
      data: {
        token: newToken,
      },
    };
  } catch (err) {
    logger.error(`Làm mới token thất bại: ${err.message}`);
    return { error: err.message || "Internal server error", code: 500 };
  }
}

module.exports = { register, login, forgotPassword, resetPassword, refreshToken };
