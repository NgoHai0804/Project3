import { socketClient } from './socketClient';
import { SOCKET_EVENTS } from '../../utils/constants';

export const gameSocket = {
  joinRoom: (roomId, password = '') => {
    socketClient.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, password });
  },

  leaveRoom: (roomId) => {
    socketClient.emit(SOCKET_EVENTS.LEAVE_ROOM, { roomId });
  },

  kickPlayer: (roomId, targetUserId) => {
    socketClient.emit(SOCKET_EVENTS.KICK_PLAYER, { roomId, targetUserId });
  },

  playerReady: (roomId, isReady = true) => {
    socketClient.emit(SOCKET_EVENTS.PLAYER_READY, { roomId, isReady });
  },

  startGame: (roomId) => {
    socketClient.emit(SOCKET_EVENTS.START_GAME, { roomId });
  },

  updateRoomSettings: (roomId, settings) => {
    socketClient.emit(SOCKET_EVENTS.UPDATE_ROOM_SETTINGS, { roomId, ...settings });
  },

  makeMove: (roomId, x, y) => {
    try {
      socketClient.emit(SOCKET_EVENTS.MAKE_MOVE, { roomId, x, y });
    } catch (error) {
      console.error('Lỗi khi emit MAKE_MOVE:', error);
      throw error;
    }
  },

  undoMove: (roomId) => {
    socketClient.emit(SOCKET_EVENTS.UNDO_MOVE, { roomId });
  },

  resetGame: (roomId) => {
    socketClient.emit(SOCKET_EVENTS.RESET_GAME, { roomId });
  },

  getGameState: (roomId) => {
    socketClient.emit(SOCKET_EVENTS.GET_GAME_STATE, { roomId });
  },

  surrenderGame: (roomId) => {
    socketClient.emit(SOCKET_EVENTS.SURRENDER_GAME, { roomId });
  },

  requestDraw: (roomId) => {
    socketClient.emit(SOCKET_EVENTS.REQUEST_DRAW, { roomId });
  },

  cancelDraw: (roomId) => {
    socketClient.emit(SOCKET_EVENTS.CANCEL_DRAW, { roomId });
  },

  respondDraw: (roomId, accept) => {
    socketClient.emit('respond_draw', { roomId, accept });
  },


  inviteToRoom: (roomId, friendId) => {
    socketClient.emit(SOCKET_EVENTS.INVITE_TO_ROOM, { roomId, friendId });
  },

  pingRoom: (roomId) => {
    socketClient.emit(SOCKET_EVENTS.PING_ROOM, { roomId });
  },

  // Lắng nghe events
  onJoinSuccess: (callback) => {
    socketClient.on(SOCKET_EVENTS.JOIN_SUCCESS, callback);
  },

  onJoinError: (callback) => {
    socketClient.on(SOCKET_EVENTS.JOIN_ERROR, callback);
  },

  onLeaveSuccess: (callback) => {
    socketClient.on(SOCKET_EVENTS.LEAVE_SUCCESS, callback);
  },

  onLeaveError: (callback) => {
    socketClient.on(SOCKET_EVENTS.LEAVE_ERROR, callback);
  },

  onRoomUpdate: (callback) => {
    socketClient.on(SOCKET_EVENTS.ROOM_UPDATE, callback);
  },

  onPlayerJoined: (callback) => {
    socketClient.on(SOCKET_EVENTS.PLAYER_JOINED, callback);
  },

  onPlayerLeft: (callback) => {
    socketClient.on(SOCKET_EVENTS.PLAYER_LEFT, callback);
  },

  onPlayerReadyStatus: (callback) => {
    socketClient.on(SOCKET_EVENTS.PLAYER_READY_STATUS, callback);
  },

  onReadyError: (callback) => {
    socketClient.on(SOCKET_EVENTS.READY_ERROR, callback);
  },

  onGameStart: (callback) => {
    socketClient.on(SOCKET_EVENTS.GAME_START, callback);
  },

  onStartError: (callback) => {
    socketClient.on(SOCKET_EVENTS.START_ERROR, callback);
  },

  onRoomSettingsUpdated: (callback) => {
    socketClient.on(SOCKET_EVENTS.ROOM_SETTINGS_UPDATED, callback);
  },

  onRoomSettingsError: (callback) => {
    socketClient.on(SOCKET_EVENTS.ROOM_SETTINGS_ERROR, callback);
  },

  onMoveMade: (callback) => {
    socketClient.on(SOCKET_EVENTS.MOVE_MADE, callback);
  },

  onTurnStarted: (callback) => {
    socketClient.on(SOCKET_EVENTS.TURN_STARTED, callback);
  },

  onMoveError: (callback) => {
    socketClient.on(SOCKET_EVENTS.MOVE_ERROR, callback);
  },

  onMoveUndone: (callback) => {
    socketClient.on(SOCKET_EVENTS.MOVE_UNDONE, callback);
  },

  onGameReset: (callback) => {
    socketClient.on(SOCKET_EVENTS.GAME_RESET, callback);
  },

  onGameEnd: (callback) => {
    socketClient.on(SOCKET_EVENTS.GAME_END, callback);
  },

  onSurrenderError: (callback) => {
    socketClient.on(SOCKET_EVENTS.SURRENDER_ERROR, callback);
  },

  onDrawRequested: (callback) => {
    socketClient.on(SOCKET_EVENTS.DRAW_REQUESTED, callback);
  },

  onDrawCancelled: (callback) => {
    socketClient.on(SOCKET_EVENTS.DRAW_CANCELLED, callback);
  },

  onDrawAccepted: (callback) => {
    socketClient.on(SOCKET_EVENTS.DRAW_ACCEPTED, callback);
  },

  onDrawRejected: (callback) => {
    socketClient.on(SOCKET_EVENTS.DRAW_REJECTED, callback);
  },

  onDrawError: (callback) => {
    socketClient.on(SOCKET_EVENTS.DRAW_ERROR, callback);
  },


  onGameState: (callback) => {
    socketClient.on(SOCKET_EVENTS.GAME_STATE, callback);
  },

  onGameStateSync: (callback) => {
    socketClient.on(SOCKET_EVENTS.GAME_STATE_SYNC, callback);
  },

  onRoomDeleted: (callback) => {
    socketClient.on(SOCKET_EVENTS.ROOM_DELETED, callback);
  },

  onPlayerDisconnected: (callback) => {
    socketClient.on(SOCKET_EVENTS.PLAYER_DISCONNECTED, callback);
  },

  onPlayerReconnected: (callback) => {
    socketClient.on(SOCKET_EVENTS.PLAYER_RECONNECTED, callback);
  },

  onPlayerKicked: (callback) => {
    socketClient.on(SOCKET_EVENTS.PLAYER_KICKED, callback);
  },

  onKickSuccess: (callback) => {
    socketClient.on(SOCKET_EVENTS.KICK_SUCCESS, callback);
  },

  onKickError: (callback) => {
    socketClient.on(SOCKET_EVENTS.KICK_ERROR, callback);
  },

  onReconnectCheck: (callback) => {
    socketClient.on(SOCKET_EVENTS.RECONNECT_CHECK, callback);
  },

  onReconnectSuccess: (callback) => {
    socketClient.on(SOCKET_EVENTS.RECONNECT_SUCCESS, callback);
  },

  checkReconnect: () => {
    socketClient.emit(SOCKET_EVENTS.CHECK_RECONNECT);
  },

  // Xóa listeners
  offJoinSuccess: (callback) => {
    socketClient.off(SOCKET_EVENTS.JOIN_SUCCESS, callback);
  },

  offJoinError: (callback) => {
    socketClient.off(SOCKET_EVENTS.JOIN_ERROR, callback);
  },

  offRoomUpdate: (callback) => {
    socketClient.off(SOCKET_EVENTS.ROOM_UPDATE, callback);
  },

  offPlayerJoined: (callback) => {
    socketClient.off(SOCKET_EVENTS.PLAYER_JOINED, callback);
  },

  offPlayerLeft: (callback) => {
    socketClient.off(SOCKET_EVENTS.PLAYER_LEFT, callback);
  },

  offPlayerReadyStatus: (callback) => {
    socketClient.off(SOCKET_EVENTS.PLAYER_READY_STATUS, callback);
  },

  offReadyError: (callback) => {
    socketClient.off(SOCKET_EVENTS.READY_ERROR, callback);
  },

  offGameStart: (callback) => {
    socketClient.off(SOCKET_EVENTS.GAME_START, callback);
  },

  offStartError: (callback) => {
    socketClient.off(SOCKET_EVENTS.START_ERROR, callback);
  },

  offRoomSettingsUpdated: (callback) => {
    socketClient.off(SOCKET_EVENTS.ROOM_SETTINGS_UPDATED, callback);
  },

  offRoomSettingsError: (callback) => {
    socketClient.off(SOCKET_EVENTS.ROOM_SETTINGS_ERROR, callback);
  },

  offMoveMade: (callback) => {
    socketClient.off(SOCKET_EVENTS.MOVE_MADE, callback);
  },

  offTurnStarted: (callback) => {
    socketClient.off(SOCKET_EVENTS.TURN_STARTED, callback);
  },

  offGameEnd: (callback) => {
    socketClient.off(SOCKET_EVENTS.GAME_END, callback);
  },

  offSurrenderError: (callback) => {
    socketClient.off(SOCKET_EVENTS.SURRENDER_ERROR, callback);
  },

  offDrawRequested: (callback) => {
    socketClient.off(SOCKET_EVENTS.DRAW_REQUESTED, callback);
  },

  offDrawCancelled: (callback) => {
    socketClient.off(SOCKET_EVENTS.DRAW_CANCELLED, callback);
  },

  offDrawAccepted: (callback) => {
    socketClient.off(SOCKET_EVENTS.DRAW_ACCEPTED, callback);
  },

  offDrawRejected: (callback) => {
    socketClient.off(SOCKET_EVENTS.DRAW_REJECTED, callback);
  },

  offDrawError: (callback) => {
    socketClient.off(SOCKET_EVENTS.DRAW_ERROR, callback);
  },


  offGameReset: (callback) => {
    socketClient.off(SOCKET_EVENTS.GAME_RESET, callback);
  },

  offMoveUndone: (callback) => {
    socketClient.off(SOCKET_EVENTS.MOVE_UNDONE, callback);
  },

  offRoomDeleted: (callback) => {
    socketClient.off(SOCKET_EVENTS.ROOM_DELETED, callback);
  },

  offPlayerDisconnected: (callback) => {
    socketClient.off(SOCKET_EVENTS.PLAYER_DISCONNECTED, callback);
  },

  offPlayerReconnected: (callback) => {
    socketClient.off(SOCKET_EVENTS.PLAYER_RECONNECTED, callback);
  },

  offPlayerKicked: (callback) => {
    socketClient.off(SOCKET_EVENTS.PLAYER_KICKED, callback);
  },

  offKickSuccess: (callback) => {
    socketClient.off(SOCKET_EVENTS.KICK_SUCCESS, callback);
  },

  offKickError: (callback) => {
    socketClient.off(SOCKET_EVENTS.KICK_ERROR, callback);
  },

  offReconnectCheck: (callback) => {
    socketClient.off(SOCKET_EVENTS.RECONNECT_CHECK, callback);
  },

  offReconnectSuccess: (callback) => {
    socketClient.off(SOCKET_EVENTS.RECONNECT_SUCCESS, callback);
  },

  offGameState: (callback) => {
    socketClient.off(SOCKET_EVENTS.GAME_STATE, callback);
  },

  offGameStateSync: (callback) => {
    socketClient.off(SOCKET_EVENTS.GAME_STATE_SYNC, callback);
  },
};

export default gameSocket;
