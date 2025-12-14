// friend.socket.js
// Xử lý các event Socket.IO liên quan đến bạn bè
// Bao gồm: thông báo trạng thái online/offline, xử lý lời mời kết bạn realtime
module.exports = function friendSocket(io, socket) {
  socket.on("add_friend", ({ userId, friendId }) => {
    // Xử lý logic thêm bạn bè (có thể mở rộng thêm sau)
    console.log(`${userId} muốn kết bạn với ${friendId}`);
  });
};
