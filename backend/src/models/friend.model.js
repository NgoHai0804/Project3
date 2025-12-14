const mongoose = require('mongoose');
const { Schema } = mongoose;

const FriendSchema = new Schema({
  requester: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // ID người gửi lời mời
  addressee: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }, // ID người nhận lời mời
  status: { type: String, enum: ['pending','accepted','canceled', 'removed'], default: 'pending' }, // Trạng thái: chờ xử lý, đã chấp nhận, đã hủy, đã xóa
  createdAt: { type: Date, default: Date.now }, // Thời gian tạo lời mời
  updateAt: { type: Date, default: Date.now }, // Thời gian cập nhật gần nhất
});

// Middleware tự động cập nhật updateAt mỗi khi save
FriendSchema.pre('save', function(next) {
  this.updateAt = Date.now();
  next();
});

FriendSchema.index({ requester: 1, addressee: 1 }, { unique: true });
module.exports = mongoose.model('Friend', FriendSchema);