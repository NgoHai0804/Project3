const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageSchema = new Schema({
  roomId: { type: Schema.Types.ObjectId, ref: 'Room', default: null, index: true }, // null nghĩa là tin nhắn riêng tư
  senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // ID người gửi
  receiverId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true }, // ID người nhận (nếu là tin nhắn riêng)

  type: { type: String, enum: ['text','emoji','sticker'], default: 'text' }, // Loại tin nhắn: text, emoji, hoặc sticker
  message: { type: String }, // Nội dung tin nhắn
  isRead: { type: Boolean, default: false }, // Trạng thái đã đọc hay chưa

  createdAt: { type: Date, default: Date.now, index: true } // Thời gian gửi tin nhắn
});
// Index để sắp xếp tin nhắn
MessageSchema.index({ roomId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', MessageSchema);