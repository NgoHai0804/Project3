const mongoose = require("mongoose");
const { Schema } = mongoose;

const NotificationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  }, // ID user nhận thông báo
  type: {
    type: String,
    enum: ["friend_request", "room_invite", "system"],
    required: true,
  }, // Loại thông báo: lời mời kết bạn, mời vào phòng, hoặc thông báo hệ thống

  content: { type: String }, // Nội dung thông báo

  isRead: { type: Boolean, default: false, index: true }, // Đã đọc hay chưa
  createdAt: { type: Date, default: Date.now }, // Thời gian tạo thông báo
});

module.exports = mongoose.model("Notification", NotificationSchema);