const mongoose = require('mongoose');
const { Schema } = mongoose;

const MoveCaroSchema = new Schema({
  userId: { type: Schema.Types.Mixed, ref: 'User' }, // ID người chơi thực hiện nước đi (có thể là ObjectId hoặc String cho bot)
  moveNumber: { type: Number, required: true }, // Số thứ tự nước đi (1, 2, 3, ...)
  pieceType: { type: String, enum: ['X', 'O'] }, // Loại quân cờ: X hoặc O
  x: { type: Number, required: true }, // Tọa độ x trên bàn cờ
  y: { type: Number, required: true }, // Tọa độ y trên bàn cờ
  createdAt: { type: Date, default: Date.now } // Thời gian thực hiện nước đi
}, { _id: false });

const GameCaroSchema = new Schema({
  nameRoom: { type: String }, // Tên phòng (nếu có)
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', index: true }, // ID phòng chơi
  playerX: { type: Schema.Types.Mixed, ref: 'User' }, // ID người chơi quân X (có thể là ObjectId hoặc String cho bot)
  playerO: { type: Schema.Types.Mixed, ref: 'User' }, // ID người chơi quân O (có thể là ObjectId hoặc String cho bot)
  winnerId: { type: Schema.Types.Mixed, ref: 'User', default: null }, // ID người thắng (null nếu hòa, có thể là ObjectId hoặc String cho bot)
  boardSize: { type: Number, default: 15 }, // Kích thước bàn cờ (mặc định 15x15)
  startedAt: { type: Date, default: Date.now }, // Thời gian bắt đầu game
  endedAt: { type: Date, default: null }, // Thời gian kết thúc game (null nếu chưa kết thúc)
  mode: { type: String, enum: ['P2P','P2B'], default: 'P2P' }, // Chế độ chơi: P2P (người vs người) hoặc P2B (người vs bot)
  moves: { type: [MoveCaroSchema], default: [] }, // Danh sách tất cả các nước đi (dùng để replay, đặc biệt khi chơi vs bot)

}, { timestamps: false });

GameCaroSchema.index({ roomId: 1, startedAt: -1 });
module.exports = mongoose.model('GameCaro', GameCaroSchema);