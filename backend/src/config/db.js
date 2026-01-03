// src/config/db.js
const mongoose = require("mongoose");

const connectDB = async (retries = 5, delay = 2000) => {
  // Kiểm tra MONGO_URI có được set chưa
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI chưa được định nghĩa trong biến môi trường");
    process.exit(1);
  }

  // Cấu hình mongoose để tránh buffering timeout
  mongoose.set('bufferCommands', false);

  for (let i = 0; i < retries; i++) {
    try {
      const conn = await mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000, // Hết thời gian chờ chọn server sau 5 giây
        socketTimeoutMS: 45000, // Hết thời gian chờ socket
        maxPoolSize: 10, // Giới hạn số kết nối tối đa
      });

      console.log(`Connected MongoDB: ${conn.connection.host}`);
      console.log(`Database: ${conn.connection.name}`);
      
      // Xử lý lỗi kết nối sau khi đã kết nối
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err.message);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected');
      });

      return conn;
    } catch (error) {
      console.error(`Connection MongoDB Error (Attempt ${i + 1}/${retries}):`, error.message);
      
      if (i < retries - 1) {
        console.log(`Đang thử lại sau ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error("Không thể kết nối đến MongoDB sau", retries, "lần thử");
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;
