// src/config/db.js
const mongoose = require("mongoose");

const connectDB = async (retries = 5, delay = 2000) => {
  // Kiểm tra MONGO_URI có được set chưa
  if (!process.env.MONGO_URI) {
    console.error("❌ MONGO_URI chưa được định nghĩa trong biến môi trường");
    console.error("Vui lòng thiết lập MONGO_URI trong file .env");
    console.error("Ví dụ: MONGO_URI=mongodb://localhost:27017/caro-online");
    process.exit(1);
  }

  // Cấu hình mongoose để tránh buffering timeout
  mongoose.set('bufferCommands', false);

  for (let i = 0; i < retries; i++) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000, // Timeout sau 5 giây
        socketTimeoutMS: 45000, // Socket timeout
        maxPoolSize: 10, // Giới hạn số kết nối
      });

      console.log(`✅ Connected MongoDB: ${conn.connection.host}`);
      console.log(`📊 Database: ${conn.connection.name}`);
      
      // Xử lý lỗi kết nối sau khi đã kết nối
      mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err.message);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('⚠️ MongoDB disconnected');
      });

      return conn;
    } catch (error) {
      console.error(`❌ Connection MongoDB Error (Attempt ${i + 1}/${retries}):`, error.message);
      
      if (i < retries - 1) {
        console.log(`⏳ Đang thử lại sau ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error("❌ Không thể kết nối đến MongoDB sau", retries, "lần thử");
        console.error("Vui lòng kiểm tra:");
        console.error("1. MongoDB đang chạy");
        console.error("2. MONGO_URI đúng: ", process.env.MONGO_URI);
        console.error("3. Firewall/Network không chặn kết nối");
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;
