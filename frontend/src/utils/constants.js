// constants.js
// Các hằng số toàn cục

// Các hằng số game
export const BOARD_SIZE = 20;
export const TIME_LIMIT = 30; // giây mỗi lượt
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;

// Events socket
export const SOCKET_EVENTS = {
  // Events phòng
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  PLAYER_READY: 'player_ready',
  START_GAME: 'start_game',
  ROOM_UPDATE: 'room_update',
  PLAYER_JOINED: 'player_joined',
  PLAYER_LEFT: 'player_left',
  PLAYER_READY_STATUS: 'player_ready_status',
  GAME_START: 'game_start',
  TURN_STARTED: 'turn_started',
  ROOM_DELETED: 'room_deleted',
  JOIN_SUCCESS: 'join_success',
  JOIN_ERROR: 'join_error',
  LEAVE_SUCCESS: 'leave_success',
  LEAVE_ERROR: 'leave_error',
  START_ERROR: 'start_error',
  READY_ERROR: 'ready_error',
  UPDATE_ROOM_SETTINGS: 'update_room_settings',
  ROOM_SETTINGS_UPDATED: 'room_settings_updated',
  ROOM_SETTINGS_ERROR: 'room_settings_error',
  PLAYER_DISCONNECTED: 'player_disconnected',
  PLAYER_RECONNECTED: 'player_reconnected',
  CHECK_RECONNECT: 'check_reconnect',
  RECONNECT_CHECK: 'reconnect_check',
  RECONNECT_SUCCESS: 'reconnect_success',
  KICK_PLAYER: 'kick_player',
  KICK_SUCCESS: 'kick_success',
  PLAYER_KICKED: 'player_kicked',
  KICK_ERROR: 'kick_error',
  INVITE_TO_ROOM: 'invite_to_room',
  INVITE_SUCCESS: 'invite_success',
  INVITE_ERROR: 'invite_error',
  PING_ROOM: 'ping_room',
  ROOM_PONG: 'room_pong',
  
  // Events game
  MAKE_MOVE: 'make_move',
  MOVE_MADE: 'move_made',
  MOVE_ERROR: 'move_error',
  UNDO_MOVE: 'undo_move',
  MOVE_UNDONE: 'move_undone',
  UNDO_ERROR: 'undo_error',
  RESET_GAME: 'reset_game',
  GAME_RESET: 'game_reset',
  RESET_ERROR: 'reset_error',
  GET_GAME_STATE: 'get_game_state',
  GAME_STATE: 'game_state',
  GAME_STATE_ERROR: 'game_state_error',
  GAME_STATE_SYNC: 'game_state_sync',
  GAME_END: 'game_end',
  SURRENDER_GAME: 'surrender_game',
  SURRENDER_ERROR: 'surrender_error',
  REQUEST_DRAW: 'request_draw',
  CANCEL_DRAW: 'cancel_draw',
  DRAW_REQUESTED: 'draw_requested',
  DRAW_ACCEPTED: 'draw_accepted',
  DRAW_REJECTED: 'draw_rejected',
  DRAW_CANCELLED: 'draw_cancelled',
  DRAW_ERROR: 'draw_error',
  
  // Events chat
  SEND_MESSAGE: 'send_message',
  MESSAGE_RECEIVED: 'message_received',
  GET_ROOM_MESSAGES: 'get_room_messages',
  ROOM_MESSAGES: 'room_messages',
  GET_PRIVATE_MESSAGES: 'get_private_messages',
  PRIVATE_MESSAGES: 'private_messages',
  CHAT_ERROR: 'chat_error',
  
  // Events kết nối
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  PING_SERVER: 'ping_server',
  PONG: 'pong',
};

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
  },
  ROOMS: {
    LIST: '/api/rooms',
    CREATE: '/api/rooms',
    JOIN: '/api/rooms/join',
    LEAVE: '/api/rooms/leave',
    GET: '/api/rooms',
  },
  USERS: {
    PROFILE: '/api/users/profile',
    UPDATE: '/api/users/profile',
  },
};

// Ký hiệu game
export const GAME_MARKS = {
  X: 'X',
  O: 'O',
};

// Trạng thái phòng
export const ROOM_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  ENDED: 'ended',
};
