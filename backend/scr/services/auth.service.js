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
    logger.info(`User registered: ${username} (${user._id})`);
    return { 
      data: { 
        id: user._id, 
        username: user.username, 
        nickname: user.nickname,
        token: token,
        refreshToken: refreshToken,
      } 
    };
  } catch (err) {
    logger.error(`Register failed: ${err.message}`);
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
    logger.info(`User logged in: ${username} (${user._id})`);

    return {
      data: {
        token,
        refreshToken,
        id: user._id,
        username: user.username,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      },
    };
  } catch (err) {
    logger.error(`Login failed for username "${username}": ${err.message}`);
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

// Xử lý quên mật khẩu - tạo mật khẩu mới và gửi email
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
      logger.warn(`Forgot password requested for non-existent email: ${email}`);
      return {
        data: {
          message: "If the email exists, a new password has been sent to your email.",
        },
      };
    }

    const newPassword = generateRandomPassword(12);
    const passwordHash = await hashPassword(newPassword);
    user.passwordHash = passwordHash;
    await user.save();

    try {
      await sendPasswordResetEmail(user.email, newPassword, user.username);
      logger.info(`Password reset email sent successfully to ${user.email} for user ${user.username}`);
    } catch (emailError) {
      logger.error(`Failed to send password reset email: ${emailError.message}`);
      throw new Error("Failed to send email. Please try again later.");
    }

    return {
      data: {
        message: "A new password has been sent to your email.",
      },
    };
  } catch (err) {
    logger.error(`Forgot password failed for email "${email}": ${err.message}`);
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
      logger.warn(`Invalid refresh token: ${err.message}`);
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
    logger.info(`Token refreshed for user: ${user.username} (${user._id})`);

    return {
      data: {
        token: newToken,
      },
    };
  } catch (err) {
    logger.error(`Refresh token failed: ${err.message}`);
    return { error: err.message || "Internal server error", code: 500 };
  }
}

module.exports = { register, login, forgotPassword, refreshToken };
