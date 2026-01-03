// models/index.js
// Export tất cả các model

const User = require('./user.model');
const Friend = require('./friend.model');
const Room = require('./room.model');
const GameCaro = require('./gameCaro.model');
const Message = require('./message.model');
const Notification = require('./notification.model');

module.exports = {
  User,
  Friend,
  Room,
  GameCaro,
  Message,
  Notification
};