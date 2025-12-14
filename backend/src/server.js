// server.js - entry point của server

const http = require("http");
const app = require("./app");
const connectDB = require("./config/db");
const initSocket = require("./sockets");

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    console.log("🔄 Đang kết nối đến MongoDB...");
    await connectDB();
    
    const server = http.createServer(app);
    const io = initSocket(server);

    server.listen(PORT, () => {
      console.log(`🚀 Server đang chạy trên cổng ${PORT}`);
      console.log(`📡 Socket.IO đã được khởi tạo`);
    });
  } catch (error) {
    console.error("❌ Lỗi khởi động server:", error.message);
    process.exit(1);
  }
};

startServer();
