// jwt.js - xử lý JWT token

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "supersecretrefreshkey";
const JWT_EXPIRES_IN = "15m";
const JWT_REFRESH_EXPIRES_IN = "7d";

// Tạo JWT access token
exports.signToken = (user) => {
  return jwt.sign({ 
    id: user._id, 
    username: user.username,
    nickname: user.nickname || user.username
  }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

// Tạo JWT refresh token
exports.signRefreshToken = (user) => {
  return jwt.sign({ 
    id: user._id, 
    username: user.username,
    type: 'refresh'
  }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
};

// Xác thực JWT access token
exports.verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

// Xác thực JWT refresh token
exports.verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET);
};
