const mongoose = require("mongoose");
const { Schema } = mongoose;

const GameStatSchema = new Schema(
  {
    gameId: { type: String, required: true }, // ID của game (ví dụ: "caro")
    nameGame: { type: String, required: true }, // Tên game (ví dụ: "Cờ Caro")
    totalGames: { type: Number, default: 0 }, // Tổng số ván đã chơi
    totalWin: { type: Number, default: 0 }, // Số ván thắng
    totalLose: { type: Number, default: 0 }, // Số ván thua
    score: { type: Number, default: 1000 }, // Điểm số của người chơi (dùng để xếp hạng)
  },
  { _id: false }
);

const UserSchema = new Schema({
  userId: { type: Number, index: true}, // ID số (nếu cần)
  username: { type: String, required: true, unique: true, index: true }, // Tên đăng nhập (duy nhất)
  passwordHash: { type: String, required: true }, // Mật khẩu đã được hash bằng bcrypt
  nickname: { type: String, required: true, unique: true }, // Tên hiển thị (duy nhất)
  email: { type: String, required: true, unique: true, index: true }, // Email (dùng để xác thực và lấy lại mật khẩu)

  avatarUrl: { type: String }, // URL ảnh đại diện
  status: {
    type: String,
    enum: ["offline", "online", "in_game", "banned"],
    default: "offline",
    index: true,
  }, // Trạng thái hoạt động (cập nhật realtime qua Socket.IO)

  gameStats: { type: [GameStatSchema], default: [] }, // Thống kê game của user (mỗi game một object)

  createdAt: { type: Date, default: Date.now }, // Thời gian tạo tài khoản
  lastOnline: { type: Date }, // Thời gian online gần nhất (cập nhật realtime qua Socket.IO)
});

module.exports = mongoose.model("User", UserSchema);