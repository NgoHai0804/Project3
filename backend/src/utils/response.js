// response.js - chuẩn hóa format response API
module.exports = {
  success(res, data = {}, message = "Success", statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  },

  error(res, message = "Internal Server Error", statusCode = 500, data = {}) {
    return res.status(statusCode).json({
      success: false,
      message,
      data,
    });
  },
};
