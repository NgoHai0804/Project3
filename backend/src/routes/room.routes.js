// routes/room.routes.js
// Routes cho phòng chơi
const verifyToken = require("../middlewares/auth.middleware");
const roomController = require("../controllers/room.controller");
const express = require("express");
const router = express.Router();

router.post("/create", verifyToken, roomController.createRoom);
router.post("/join", verifyToken, roomController.joinRoom);
router.post("/leave", verifyToken, roomController.leaveRoom);
router.post("/update", verifyToken, roomController.updateRoom);
router.post("/toggle-ready", verifyToken, roomController.toggleReady);
router.post("/end", verifyToken, roomController.endGame);
router.get("/list", verifyToken, roomController.getRoomList);
router.get("/check-user-room", verifyToken, roomController.checkUserRoom);
router.post("/verify-password", verifyToken, roomController.verifyPassword);

module.exports = router;
