// auth.controller.js - xử lý request xác thực người dùng

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
    logger.error(`register error: ${err}`);
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
    logger.error(`login error: ${err}`);
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
    logger.error(`forgotPassword error: ${err}`);
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
    logger.error(`refresh error: ${err}`);
    return response.error(res, "Internal server error", 500);
  }
}

module.exports = {
  register,
  login,
  forgotPassword,
  refresh,
};
