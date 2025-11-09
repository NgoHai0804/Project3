// index.js
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const gameSocket = require("./game");
const chatSocket = require("./chat.socket");
const roomSocket = require("./room");
const friendSocket = require("./friend.socket");

function initSocket(server) {
  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  // Set io instance cho friend.service để có thể emit notifications
  const friendService = require("../services/friend.service");
  friendService.setSocketInstance(io);

  // Map để track các socket connections của mỗi user (userId -> [socketIds])
  const userSockets = new Map();

  // Middleware xác thực JWT - kiểm tra token trước khi cho phép kết nối
  io.use((socket, next) => {
    console.log("Đang kiểm tra token cho socket:", socket.id);
    console.log("Handshake auth:", socket.handshake.auth);
    console.log("Handshake headers:", socket.handshake.headers);

    // Lấy token từ auth hoặc headers
    let token = socket.handshake.auth?.token || socket.handshake.headers["authorization"] || socket.handshake.headers["Authorization"];
    
    // Kiểm tra token có tồn tại không
    if (!token) {
      console.log("Không tìm thấy token trong handshake");
      return next(new Error("No token provided"));
    }

    try {
      // Loại bỏ "Bearer " nếu có
      let tokenStr = token.replace("Bearer ", "").trim();
      // Loại bỏ dấu ngoặc kép nếu có
      tokenStr = tokenStr.replace(/^"(.*)"$/, '$1');
      
      // Kiểm tra token sau khi xử lý
      if (!tokenStr || tokenStr === 'null' || tokenStr === 'undefined') {
        console.log("Token rỗng sau khi xử lý");
        return next(new Error("Invalid token format"));
      }

      // Xác thực token bằng JWT_SECRET
      const decoded = jwt.verify(tokenStr, process.env.JWT_SECRET);

      // Lưu thông tin user vào socket để sử dụng sau này
      socket.user = {
        _id: decoded.id || decoded._id,
        username: decoded.username,
        nickname: decoded.nickname || decoded.username,
      };
      console.log("Token hợp lệ cho user:", decoded.username, "ID:", socket.user._id);
      next();
    } catch (err) {
      console.log("Token không hợp lệ:", err.message);
      console.log("Chi tiết lỗi token:", err);
      return next(new Error("Invalid token: " + err.message));
    }
  });

  // Xử lý khi có client kết nối
  io.on("connection", (socket) => {
    const userId = socket.user._id.toString();
    console.log(`User đã kết nối: ${socket.id} (${socket.user.username})`);

    // Join socket vào room với userId để có thể gửi message trực tiếp đến user
    socket.join(userId);

    // Theo dõi tất cả socket connections của user này
    if (!userSockets.has(userId)) {
      userSockets.set(userId, []);
    }
    const userSocketList = userSockets.get(userId);
    userSocketList.push(socket.id);

    // Cập nhật trạng thái user thành 'online' khi kết nối (chỉ khi đây là socket đầu tiên)
    if (userSocketList.length === 1) {
      const UserService = require("../services/user.service");
      UserService.updateUserStatus(userId, "online").catch(err => {
        console.error("Lỗi khi cập nhật trạng thái user thành online:", err);
      });
    }

    // Giới hạn số lượng kết nối: nếu user có nhiều hơn 2 socket, đóng các socket cũ
    if (userSocketList.length > 2) {
      console.log(`User ${socket.user.username} có ${userSocketList.length} kết nối, đang đóng các kết nối cũ...`);
      // Giữ lại 2 socket mới nhất, đóng các socket cũ hơn
      const socketsToClose = userSocketList.slice(0, userSocketList.length - 2);
      socketsToClose.forEach(oldSocketId => {
        const oldSocket = io.sockets.sockets.get(oldSocketId);
        if (oldSocket) {
          console.log(`Đang đóng socket trùng lặp: ${oldSocketId}`);
          oldSocket.disconnect(true);
        }
        // Xóa socket khỏi danh sách
        const index = userSocketList.indexOf(oldSocketId);
        if (index > -1) {
          userSocketList.splice(index, 1);
        }
      });
    }

    // ---------------------------
    // Timeout & ping/pong - giữ kết nối sống
    // ---------------------------
    // Thiết lập timeout 15 giây để phù hợp với ping gửi mỗi 5 giây
    let pingTimeout = setTimeout(() => {
      console.log(`User ${socket.id} đã hết thời gian (timeout)`);
      socket.disconnect(true);
    }, 15000);

    // Xử lý ping từ client để giữ kết nối
    socket.on("ping_server", () => {
      console.log(`Đã nhận ping từ ${socket.id}`);
      clearTimeout(pingTimeout);
      // Reset timeout mỗi khi nhận được ping (gia hạn thêm 15 giây)
      pingTimeout = setTimeout(() => {
        console.log(`User ${socket.id} đã hết thời gian (timeout)`);
        socket.disconnect(true);
      }, 15000);
      // Gửi pong về client
      socket.emit("pong_server", { time: Date.now() });
    });

    // ---------------------------
    // Đăng ký các socket handler cho từng module
    // ---------------------------
    gameSocket(io, socket);    // Xử lý logic game
    chatSocket(io, socket);    // Xử lý tin nhắn chat
    roomSocket(io, socket);    // Xử lý phòng chơi
    friendSocket(io, socket);  // Xử lý bạn bè

    // Xử lý khi client ngắt kết nối
    socket.on("disconnect", (reason) => {
      clearTimeout(pingTimeout);
      console.log(`User đã ngắt kết nối: ${socket.id} (${reason})`);
      
      // Xóa socket khỏi danh sách tracking
      const userSocketList = userSockets.get(userId);
      if (userSocketList) {
        const index = userSocketList.indexOf(socket.id);
        if (index > -1) {
          userSocketList.splice(index, 1);
        }
        // Nếu user không còn socket nào, cập nhật trạng thái thành 'offline' và xóa khỏi map
        if (userSocketList.length === 0) {
          userSockets.delete(userId);
          const UserService = require("../services/user.service");
          UserService.updateUserStatus(userId, "offline").catch(err => {
            console.error("Lỗi khi cập nhật trạng thái user thành offline:", err);
          });
        }
      }
    });
  });

  return io;
}

module.exports = initSocket;
