// app.js - khởi tạo và cấu hình Express app

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const apiRouter = require("./routes/index");
app.use("/api", apiRouter);

// Endpoint kiểm tra sức khỏe cho Docker
app.get("/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Phục vụ file tĩnh từ frontend build (production)
if (process.env.NODE_ENV === "production") {
  const path = require("path");
  const frontendPath = path.join(__dirname, "../../frontend/dist");
  
  // Phục vụ file tĩnh
  app.use(express.static(frontendPath));
  
  // Dự phòng: phục vụ index.html cho tất cả routes không phải API
  app.get("*", (req, res) => {
    // Không phục vụ index.html cho API routes
    if (req.path.startsWith("/api")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    res.sendFile(path.join(frontendPath, "index.html"));
  });
} else {
  // Chế độ phát triển
  app.get("/", (req, res) => {
    res.send("Caro Online Backend đang hoạt động! (Development Mode)");
  });
}

module.exports = app;
