const mongoose = require("mongoose");
const { Schema } = mongoose;

const RoomPlayerSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true }, // ID người chơi
  username: { type: String }, // Tên người chơi (để hiển thị khi disconnect)
  isHost: { type: Boolean, default: false }, // Có phải chủ phòng không (người tạo)
  isReady: { type: Boolean, default: false }, // Người chơi đã bấm "Ready" để bắt đầu chưa
  joinedAt: { type: Date, default: Date.now }, // Thời điểm người chơi tham gia phòng
  sessionId: { type: String }, // ID phiên socket hiện tại (để reconnect nhanh nếu rớt mạng)
  isDisconnected: { type: Boolean, default: false }, // Trạng thái disconnect
  disconnectedAt: { type: Date }, // Thời điểm disconnect
});

const RoomSchema = new Schema({
  name: { type: String }, // Tên hiển thị của phòng (đổi từ roomName theo diagram)
  passwordHash: { type: String, default: null }, // Mật khẩu phòng
  hostId: { type: Schema.Types.ObjectId, ref: "User", index: true }, // ID chủ phòng
  maxPlayers: { type: Number, default: 2 }, // Giới hạn số người chơi trong phòng (2–4)

  status: {
    type: String,
    enum: ["waiting", "playing", "ended"],
    default: "waiting",
    index: true,
  },

  players: { type: [RoomPlayerSchema], default: [] }, // DS người chơi trong phòng
  turnTimeLimit: { type: Number, default: 30 }, // Thời gian mỗi lượt đi (giây), mặc định 30s
  playerMarks: { type: Map, of: String, default: {} }, // Map userId -> mark (X hoặc O)
  firstTurn: { type: String, enum: ['X', 'O'], default: 'X' }, // Ai đi trước (X hoặc O)
  createdAt: { type: Date, default: Date.now }, // Thời gian tạo phòng
});

// Index đã được định nghĩa trong schema với index: true, không cần định nghĩa lại

module.exports = mongoose.model("Room", RoomSchema);
