// auth.controller.js

const authService = require("../services/auth.service");
const response = require("../utils/response");
const logger = require("../utils/logger");


// Xử lý đăng ký tài khoản mới
async function register(req, res) {
  try {
    const result = await authService.register(req.body);

    if (result.error) {
      return response.error(res, result.error, result.code || 400);
    }

    return response.success(res, result.data, "Registered successfully");
  } catch (err) {
    logger.error(`Lỗi khi đăng ký: ${err}`);
    return response.error(res, "Internal server error", 500);
  }
}


// Xử lý đăng nhập người dùng
async function login(req, res) {
  try {
    const result = await authService.login(req.body);

    if (result.error) {
      return response.error(res, result.error, result.code || 400);
    }

    return response.success(res, result.data, "Login successfully");
  } catch (err) {
    logger.error(`Lỗi khi đăng nhập: ${err}`);
    return response.error(res, "Internal server error", 500);
  }
}


// Xử lý yêu cầu quên mật khẩu
async function forgotPassword(req, res) {
  try {
    const result = await authService.forgotPassword(req.body);

    if (result.error) {
      return response.error(res, result.error, result.code || 400);
    }

    return response.success(res, result.data, result.data.message || "Password reset email sent successfully");
  } catch (err) {
    logger.error(`Lỗi khi quên mật khẩu: ${err}`);
    return response.error(res, "Internal server error", 500);
  }
}

// Xử lý reset mật khẩu với mã xác nhận
async function resetPassword(req, res) {
  try {
    const result = await authService.resetPassword(req.body);

    if (result.error) {
      return response.error(res, result.error, result.code || 400);
    }

    return response.success(res, result.data, result.data.message || "Password reset successfully");
  } catch (err) {
    logger.error(`Lỗi khi đặt lại mật khẩu: ${err}`);
    return response.error(res, "Internal server error", 500);
  }
}

// Xử lý refresh token
async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return response.error(res, "Refresh token is required", 400);
    }

    const result = await authService.refreshToken(refreshToken);

    if (result.error) {
      return response.error(res, result.error, result.code || 400);
    }

    return response.success(res, result.data, "Token refreshed successfully");
  } catch (err) {
    logger.error(`Lỗi khi làm mới token: ${err}`);
    return response.error(res, "Internal server error", 500);
  }
}

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  refresh,
};
