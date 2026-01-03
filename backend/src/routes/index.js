// index.js
// Tập hợp tất cả các route

const express = require("express");
const router = express.Router();

router.use("/auth", require("./auth.routes"));
router.use("/users", require("./user.routes"));
router.use("/friend", require("./friend.routes"));
router.use("/rooms", require("./room.routes")); // Route quản lý phòng chơi
router.use("/bot", require("./bot.routes"));
router.use("/chat", require("./chat.routes"));

module.exports = router;
