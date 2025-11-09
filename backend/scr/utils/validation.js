// utils/validation.js - kiểm tra và xử lý dữ liệu đầu vào
const bcrypt = require("bcrypt");

// Kiểm tra dữ liệu có hợp lệ không
function checkData(value, lengthMin, lengthMax, allowSpecial = false) {
  if (!value || value.length < lengthMin || value.length > lengthMax) {
    return { valid: false, message: `Length must be between ${lengthMin} and ${lengthMax} characters.` };
  }
  const specialCharRegex = allowSpecial ? null : /[^a-zA-Z0-9_]/;
  if (!allowSpecial && specialCharRegex.test(value)) {
    return { valid: false, message: "Only alphanumeric and underscore allowed." };
  }
  return { valid: true };
}

// Kiểm tra nickname (cho phép ký tự tiếng Việt)
function checkNickname(value, lengthMin = 5, lengthMax = 15) {
  if (!value || typeof value !== 'string') {
    return { valid: false, message: "Nickname không hợp lệ." };
  }
  
  // Kiểm tra độ dài
  if (value.length < lengthMin || value.length > lengthMax) {
    return { valid: false, message: `Nickname phải có độ dài từ ${lengthMin} đến ${lengthMax} ký tự.` };
  }
  
  if (value.trim() !== value) {
    return { valid: false, message: "Nickname không được bắt đầu hoặc kết thúc bằng khoảng trắng." };
  }
  
  const nicknameRegex = /^[\p{L}\p{N}\s_-]+$/u;
  if (!nicknameRegex.test(value)) {
    return { valid: false, message: "Nickname chỉ được chứa chữ cái, số, khoảng trắng, dấu gạch dưới và dấu gạch ngang." };
  }
  
  if (value.trim().length === 0) {
    return { valid: false, message: "Nickname không được chỉ chứa khoảng trắng." };
  }
  
  return { valid: true };
}

// Hash mật khẩu
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

module.exports = { checkData, checkNickname, hashPassword };