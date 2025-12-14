# Tài Liệu Chi Tiết Socket Backend

## Tổng Quan

Hệ thống Socket.IO của backend được xây dựng để xử lý các tương tác realtime trong game cờ caro, bao gồm:
- Quản lý phòng chơi (room management)
- Xử lý game logic (game moves, timer, win conditions)
- Chat realtime (trong phòng và chat riêng)
- Quản lý bạn bè (friend management)
- Ping/pong để duy trì kết nối

---

## 1. Cấu Trúc Tổng Quan

### 1.1 Entry Point
**File:** `src/sockets/index.js`

Đây là file chính khởi tạo Socket.IO server và đăng ký tất cả các handlers.

**Chức năng chính:**
- Khởi tạo Socket.IO server với CORS
- Xác thực JWT token cho mỗi kết nối
- Quản lý user sockets (theo dõi nhiều kết nối của cùng 1 user)
- Đăng ký các module handlers: game, chat, room, friend
- Xử lý ping/pong để giữ kết nối sống
- Cập nhật trạng thái user (online/offline)

**Các Map quan trọng:**
- `userSockets`: Map theo dõi tất cả socket connections của mỗi user (userId -> [socketIds])
- Giới hạn tối đa 2 socket connections cho mỗi user

### 1.2 Xác Thực JWT

**Middleware xác thực:**
```javascript
io.use((socket, next) => {
  // Lấy token từ auth hoặc headers
  // Xác thực token bằng JWT_SECRET
  // Lưu thông tin user vào socket.user
})
```

**Token được lấy từ:**
- `socket.handshake.auth.token`
- `socket.handshake.headers["authorization"]` hoặc `["Authorization"]`

**Sau khi xác thực thành công:**
- Thông tin user được lưu vào `socket.user`:
  - `_id`: User ID
  - `username`: Tên đăng nhập
  - `nickname`: Tên hiển thị

---

## 2. Module Game Socket

**File:** `src/sockets/game/index.js`

### 2.1 Các Event Handlers

#### `make_move`
**Handler:** `src/sockets/game/move.js::handleMakeMove`

**Chức năng:**
- Xử lý khi người chơi đánh cờ tại vị trí (x, y)
- Kiểm tra lượt chơi hợp lệ
- Cập nhật bàn cờ và lịch sử
- Kiểm tra điều kiện thắng/thua/hòa
- Quản lý turn timer

**Flow xử lý:**
1. Kiểm tra lock (tránh xử lý nhiều move cùng lúc)
2. Kiểm tra phòng tồn tại và đang trong trạng thái "playing"
3. Kiểm tra người chơi có trong phòng
4. Kiểm tra đúng lượt chơi
5. Kiểm tra vị trí hợp lệ và chưa có cờ
6. Đánh cờ và cập nhật lịch sử
7. Kiểm tra thắng/thua/hòa
8. Nếu thắng/thua/hòa: kết thúc game, cập nhật stats, lưu lịch sử
9. Nếu chưa kết thúc: đổi lượt, bắt đầu timer mới

**Lock mechanism:**
- Sử dụng `roomMoveLocks` Map để tránh race condition
- Format: `roomId -> boolean`

**Events emit:**
- `move_made`: Thông báo nước đi cho tất cả người chơi
- `game_end`: Khi game kết thúc
- `turn_started`: Khi bắt đầu lượt mới
- `move_error`: Khi có lỗi

#### `undo_move`
**Handler:** `src/sockets/game/move.js::handleUndoMove`

**Chức năng:**
- Hoàn tác nước đi cuối cùng
- Chỉ cho phép undo nước đi của chính mình hoặc nếu là host
- Nếu chơi vs Bot (1 player), undo 2 nước

**Events emit:**
- `move_undone`: Thông báo đã hoàn tác

#### `reset_game`
**Handler:** `src/sockets/game/move.js::handleResetGame`

**Chức năng:**
- Reset game về trạng thái ban đầu
- Chỉ chủ phòng mới có quyền reset
- Reset bàn cờ, lịch sử, trạng thái ready

**Events emit:**
- `game_reset`: Thông báo game đã được reset
- `room_update`: Cập nhật trạng thái phòng

#### `get_game_state`
**Handler:** `src/sockets/game/index.js::handleGetGameState`

**Chức năng:**
- Lấy trạng thái game hiện tại (bàn cờ, lượt chơi, lịch sử)
- Dùng để đồng bộ khi reconnect

**Events emit:**
- `game_state`: Trả về trạng thái game đầy đủ

#### `request_draw`
**Handler:** `src/sockets/game/draw.js::handleRequestDraw`

**Chức năng:**
- Người chơi xin hòa
- Lưu yêu cầu vào `pendingDrawRequests`

**Events emit:**
- `draw_requested`: Thông báo yêu cầu xin hòa

#### `cancel_draw`
**Handler:** `src/sockets/game/draw.js::handleCancelDraw`

**Chức năng:**
- Hủy yêu cầu xin hòa
- Chỉ người gửi yêu cầu mới có thể hủy

**Events emit:**
- `draw_cancelled`: Thông báo đã hủy yêu cầu

#### `respond_draw`
**Handler:** `src/sockets/game/draw.js::handleRespondDraw`

**Chức năng:**
- Phản hồi yêu cầu xin hòa (chấp nhận/từ chối)
- Nếu chấp nhận: kết thúc game hòa, cập nhật stats

**Events emit:**
- `draw_accepted`: Khi chấp nhận hòa
- `draw_rejected`: Khi từ chối hòa
- `game_end`: Khi game kết thúc hòa

#### `surrender_game`
**Handler:** `src/sockets/game/surrender.js::handleSurrender`

**Chức năng:**
- Người chơi đầu hàng
- Tự động thua, đối thủ thắng
- Cập nhật stats, lưu lịch sử

**Events emit:**
- `game_end`: Thông báo game kết thúc
- `room_update`: Cập nhật trạng thái phòng

### 2.2 Game State Management

**File:** `src/sockets/game/state.js`

**Chức năng:**
- Quản lý trạng thái game trong memory (không lưu DB)
- Lưu trữ: bàn cờ, lượt chơi, lịch sử nước đi

**Cấu trúc:**
```javascript
roomGames[roomId] = {
  board: Array(20).fill(null).map(() => Array(20).fill(null)),
  turn: "X" | "O",
  history: [{ x, y, mark, userId, username, nickname, timestamp }],
  currentPlayerIndex: 0 | 1,
  turnStartTime: timestamp,
  turnTimer: timeout
}
```

**Functions:**
- `initBoard(size = 20)`: Khởi tạo bàn cờ rỗng
- `getGameState(roomId)`: Lấy trạng thái game (tạo mới nếu chưa có)
- `initGameForRoom(roomId, players)`: Khởi tạo game khi bắt đầu
- `emitGameStateSync(io, roomId, room, game, message)`: Đồng bộ trạng thái cho tất cả client

### 2.3 Turn Timer

**File:** `src/sockets/game/timer.js`

**Chức năng:**
- Quản lý timer cho mỗi lượt chơi
- Tự động kết thúc game nếu hết thời gian

**Cơ chế:**
- Mỗi phòng có 1 timer cho lượt hiện tại
- Timer được reset mỗi khi có nước đi mới
- Khi hết thời gian: người chơi hiện tại thua, đối thủ thắng

**Functions:**
- `startTurnTimer(io, roomIdStr, turnTimeLimit)`: Bắt đầu timer
- `stopTurnTimer(roomIdStr)`: Dừng timer

**Map:**
- `roomTurnTimers`: Map theo dõi timer cho mỗi phòng (roomId -> timeout)

---

## 3. Module Room Socket

**File:** `src/sockets/room/index.js`

### 3.1 Các Event Handlers

#### `join_room`
**Handler:** `src/sockets/room/join.js::handleJoinRoom`

**Chức năng:**
- Người chơi tham gia phòng
- Kiểm tra mật khẩu (nếu có)
- Join socket vào room với roomId
- Theo dõi mapping socket -> room

**Flow:**
1. Kiểm tra request trùng lặp (tránh join nhiều lần)
2. Gọi `RoomService.joinRoom()`
3. Lưu mapping `socketToRoom[socket.id] = roomId`
4. `socket.join(roomId)` để nhận events của phòng
5. Emit events cho tất cả người trong phòng

**Events emit:**
- `join_success`: Xác nhận join thành công (cho người join)
- `player_joined`: Thông báo người mới join (cho người khác)
- `room_update`: Cập nhật trạng thái phòng

**Map:**
- `socketToRoom`: Map theo dõi socket nào đang ở phòng nào (socketId -> roomId)
- `joiningUsers`: Map tránh xử lý join trùng lặp (userId_roomId -> boolean)

#### `player_ready`
**Handler:** `src/sockets/room/ready.js::handlePlayerReady`

**Chức năng:**
- Đánh dấu người chơi sẵn sàng
- Cần tất cả người chơi (trừ chủ phòng) ready mới có thể start game

**Events emit:**
- `player_ready`: Thông báo người chơi đã ready
- `room_update`: Cập nhật trạng thái phòng

#### `start_game`
**Handler:** `src/sockets/room/start.js::handleStartGame`

**Chức năng:**
- Bắt đầu game (chỉ chủ phòng mới có quyền)
- Kiểm tra tất cả người chơi đã ready
- Khởi tạo game state
- Bắt đầu turn timer
- Khởi tạo ping tracking

**Flow:**
1. Kiểm tra quyền (chỉ host)
2. Kiểm tra game chưa bắt đầu
3. Kiểm tra đủ 2 người chơi
4. Kiểm tra tất cả người chơi đã ready
5. Cập nhật room status = "playing"
6. Khởi tạo game state
7. Bắt đầu turn timer
8. Khởi tạo ping tracking cho tất cả players
9. Emit events

**Events emit:**
- `game_start`: Thông báo game đã bắt đầu
- `room_update`: Cập nhật trạng thái phòng

#### `leave_room`
**Handler:** `src/sockets/room/leave.js::handleLeaveRoom`

**Chức năng:**
- Người chơi rời phòng
- Nếu đang chơi: tự động thua, đối thủ thắng
- Cleanup game state, ping tracking

**Flow:**
1. Nếu đang chơi: kết thúc game (người rời thua)
2. Gọi `RoomService.leaveRoom()`
3. Xóa mapping `socketToRoom`
4. `socket.leave(roomId)`
5. Cleanup ping tracking
6. Emit events

**Events emit:**
- `leave_success`: Xác nhận rời phòng (cho người rời)
- `player_left`: Thông báo người rời (cho người khác)
- `room_update`: Cập nhật trạng thái phòng
- `game_end`: Nếu đang chơi
- `room_deleted`: Nếu phòng không còn ai

#### `kick_player`
**Handler:** `src/sockets/room/kick.js::handleKickPlayer`

**Chức năng:**
- Chủ phòng đuổi người chơi khỏi phòng
- Nếu đang chơi: tự động kết thúc game (người bị kick thua)

**Flow:**
1. Kiểm tra quyền (chỉ host)
2. Không thể kick chính mình
3. Nếu đang chơi: kết thúc game
4. Gọi `RoomService.leaveRoom()` cho người bị kick
5. Tìm socket của người bị kick và cleanup
6. Emit events

**Events emit:**
- `player_kicked`: Thông báo cho người bị kick
- `kick_success`: Xác nhận cho chủ phòng
- `player_left`: Thông báo cho người khác
- `room_update`: Cập nhật trạng thái phòng
- `game_end`: Nếu đang chơi

#### `update_room_settings`
**Handler:** `src/sockets/room/settings.js::handleUpdateRoomSettings`

**Chức năng:**
- Cập nhật cài đặt phòng (chỉ chủ phòng)
- Các settings: turnTimeLimit, boardSize, firstTurn, etc.

**Events emit:**
- `room_settings_updated`: Thông báo cài đặt đã cập nhật
- `room_update`: Cập nhật trạng thái phòng

#### `invite_to_room`
**Handler:** `src/sockets/room/invite.js::handleInviteToRoom`

**Chức năng:**
- Mời người chơi khác vào phòng
- Gửi notification cho người được mời

**Events emit:**
- `room_invite`: Thông báo cho người được mời
- `invite_sent`: Xác nhận cho người gửi

#### `check_reconnect`
**Handler:** `src/sockets/room/reconnect.js::handleCheckAndReconnect`

**Chức năng:**
- Kiểm tra và kết nối lại với phòng sau khi disconnect
- Khôi phục game state nếu đang chơi
- Đánh dấu player reconnected

**Flow:**
1. Tìm phòng mà user đang tham gia
2. Kiểm tra player có đang disconnected không
3. Nếu có: đánh dấu reconnected, join lại socket room
4. Lấy game state nếu đang chơi
5. Khởi tạo lại ping tracking
6. Emit events

**Events emit:**
- `reconnect_success`: Xác nhận reconnect thành công
- `reconnect_check`: Kết quả kiểm tra reconnect
- `player_reconnected`: Thông báo cho người khác
- `room_update`: Cập nhật trạng thái phòng

#### `ping_room`
**Handler:** `src/sockets/room/ping.js::handlePingRoom`

**Chức năng:**
- Ping khi đang chơi để duy trì kết nối
- Cập nhật last ping time
- Reset ping timeout

**Events emit:**
- `room_pong`: Trả về pong với thời gian còn lại

### 3.2 Ping Tracking & Timeout

**File:** `src/sockets/room/ping.js`

**Chức năng:**
- Theo dõi ping của mỗi người chơi trong phòng đang chơi
- Tự động đẩy player ra nếu không ping trong 30 giây

**Cơ chế:**
- Mỗi phòng có 1 Map theo dõi last ping time của mỗi player
- Mỗi player có 1 timeout 30 giây
- Khi hết timeout: tự động đầu hàng và đẩy ra khỏi phòng

**Maps:**
- `roomPlayerPings`: Map theo dõi last ping time (roomId -> { userId -> timestamp })
- `roomPingTimeouts`: Map theo dõi timeout (roomId_userId -> timeout)

**Functions:**
- `startPingTimeout(io, roomIdStr, userId, username)`: Bắt đầu timeout
- `cleanupPingTracking(roomIdStr, userId)`: Cleanup cho 1 player
- `cleanupAllPingTracking(roomIdStr)`: Cleanup cho tất cả players trong phòng
- `autoRemovePlayerOnTimeout(io, roomIdStr, userId, username)`: Tự động đẩy player ra khi timeout

### 3.3 Disconnect Handling

**Handler:** `src/sockets/room/index.js::handleDisconnect`

**Chức năng:**
- Xử lý khi socket disconnect
- Nếu đang chơi: kết thúc game (người disconnect thua)
- Xóa player khỏi phòng ngay lập tức
- Cleanup ping tracking

**Flow:**
1. Lấy roomId từ `socketToRoom`
2. Nếu phòng chỉ có 1 player và player đó disconnect: xóa phòng
3. Nếu đang chơi: kết thúc game (người disconnect thua)
4. Xóa player khỏi phòng
5. Cleanup ping tracking
6. Emit events

**Events emit:**
- `player_left`: Thông báo người rời
- `room_update`: Cập nhật trạng thái phòng
- `game_end`: Nếu đang chơi
- `room_deleted`: Nếu phòng bị xóa

---

## 4. Module Chat Socket

**File:** `src/sockets/chat.socket.js`

### 4.1 Các Event Handlers

#### `send_message`
**Chức năng:**
- Gửi tin nhắn (trong phòng hoặc chat riêng)
- Lưu tin nhắn vào database
- Gửi realtime cho người nhận

**Flow:**
1. Kiểm tra tin nhắn không rỗng
2. Nếu là chat trong phòng: kiểm tra user có trong phòng
3. Lưu tin nhắn vào DB qua `ChatService.saveMessage()`
4. Emit cho người nhận (hoặc tất cả người trong phòng)

**Events emit:**
- `message_received`: Tin nhắn mới (cho người nhận và người gửi)
- `chat_error`: Khi có lỗi

#### `get_room_messages`
**Chức năng:**
- Lấy lịch sử chat của phòng
- Đánh dấu tất cả tin nhắn là đã đọc

**Events emit:**
- `room_messages`: Trả về danh sách tin nhắn
- `chat_error`: Khi có lỗi

#### `get_private_messages`
**Chức năng:**
- Lấy lịch sử chat riêng giữa 2 người

**Events emit:**
- `private_messages`: Trả về danh sách tin nhắn
- `chat_error`: Khi có lỗi

---

## 5. Module Friend Socket

**File:** `src/sockets/friend.socket.js`

### 5.1 Các Event Handlers

#### `add_friend`
**Chức năng:**
- Xử lý logic thêm bạn bè (có thể mở rộng thêm sau)
- Hiện tại chỉ log

**Lưu ý:** Module này có thể được mở rộng để xử lý các event realtime liên quan đến bạn bè.

---

## 6. Ping/Pong Mechanism

### 6.1 Server Ping/Pong
**File:** `src/sockets/index.js`

**Chức năng:**
- Giữ kết nối socket sống
- Client gửi `ping_server` mỗi 5 giây
- Server trả về `pong_server`
- Timeout 15 giây nếu không nhận được ping

**Cơ chế:**
- Mỗi socket có 1 timeout 15 giây
- Mỗi khi nhận `ping_server`: reset timeout
- Nếu hết timeout: disconnect socket

### 6.2 Room Ping/Pong
**File:** `src/sockets/room/ping.js`

**Chức năng:**
- Ping khi đang chơi để duy trì kết nối
- Timeout 30 giây nếu không ping
- Tự động đẩy player ra nếu timeout

---

## 7. Data Structures & Maps

### 7.1 Maps Quan Trọng

#### `userSockets` (src/sockets/index.js)
- **Type:** `Map<userId, [socketIds]>`
- **Chức năng:** Theo dõi tất cả socket connections của mỗi user
- **Giới hạn:** Tối đa 2 socket cho mỗi user

#### `socketToRoom` (src/sockets/room/join.js)
- **Type:** `Map<socketId, roomId>`
- **Chức năng:** Theo dõi socket nào đang ở phòng nào

#### `roomGames` (src/sockets/game/state.js)
- **Type:** `Object<roomId, gameState>`
- **Chức năng:** Lưu trữ trạng thái game trong memory

#### `roomMoveLocks` (src/sockets/game/move.js)
- **Type:** `Map<roomId, boolean>`
- **Chức năng:** Lock để tránh xử lý nhiều move cùng lúc

#### `roomTurnTimers` (src/sockets/game/timer.js)
- **Type:** `Map<roomId, timeout>`
- **Chức năng:** Timer cho mỗi lượt chơi

#### `roomPlayerPings` (src/sockets/room/ping.js)
- **Type:** `Map<roomId, Map<userId, timestamp>>`
- **Chức năng:** Theo dõi last ping time của mỗi player

#### `roomPingTimeouts` (src/sockets/room/ping.js)
- **Type:** `Map<roomId_userId, timeout>`
- **Chức năng:** Timeout cho mỗi player trong phòng đang chơi

#### `pendingDrawRequests` (src/sockets/game/draw.js)
- **Type:** `Object<roomId, { requesterId, timestamp }>`
- **Chức năng:** Lưu trữ các yêu cầu xin hòa đang chờ

#### `joiningUsers` (src/sockets/room/join.js)
- **Type:** `Map<userId_roomId, boolean>`
- **Chức năng:** Tránh xử lý join trùng lặp

---

## 8. Event Flow Diagrams

### 8.1 Flow Join Room
```
Client -> join_room
  -> Kiểm tra request trùng lặp
  -> RoomService.joinRoom()
  -> socketToRoom[socket.id] = roomId
  -> socket.join(roomId)
  -> emit join_success (cho client)
  -> emit player_joined (cho người khác)
  -> emit room_update (cho tất cả)
```

### 8.2 Flow Start Game
```
Client -> start_game
  -> Kiểm tra quyền (chỉ host)
  -> Kiểm tra đủ 2 người chơi
  -> Kiểm tra tất cả ready
  -> RoomService.updateRoom(status: "playing")
  -> initGameForRoom() (khởi tạo game state)
  -> startTurnTimer() (bắt đầu timer)
  -> startPingTimeout() (cho tất cả players)
  -> emit game_start (cho tất cả)
  -> emit room_update (cho tất cả)
```

### 8.3 Flow Make Move
```
Client -> make_move
  -> Kiểm tra lock
  -> Kiểm tra phòng và trạng thái
  -> Kiểm tra lượt chơi
  -> Kiểm tra vị trí hợp lệ
  -> Cập nhật bàn cờ và lịch sử
  -> Kiểm tra thắng/thua/hòa
  -> Nếu thắng/thua/hòa:
     -> RoomService.endGame()
     -> UserService.updateGameStats()
     -> GameCaroService.saveGameHistory()
     -> emit game_end
  -> Nếu chưa kết thúc:
     -> Đổi lượt
     -> stopTurnTimer()
     -> startTurnTimer()
     -> emit turn_started
  -> emit move_made (cho tất cả)
```

### 8.4 Flow Disconnect
```
Socket -> disconnect
  -> Lấy roomId từ socketToRoom
  -> Nếu phòng chỉ có 1 player: xóa phòng
  -> Nếu đang chơi:
     -> Kết thúc game (người disconnect thua)
     -> Cập nhật stats
     -> Cleanup game state
  -> RoomService.removeDisconnectedPlayer()
  -> Cleanup ping tracking
  -> socketToRoom.delete(socket.id)
  -> socket.leave(roomId)
  -> emit player_left (cho người khác)
  -> emit room_update (cho tất cả)
```

---

## 9. Error Handling

### 9.1 Các Loại Error Events

- `move_error`: Lỗi khi đánh cờ
- `undo_error`: Lỗi khi hoàn tác
- `reset_error`: Lỗi khi reset game
- `draw_error`: Lỗi khi xin hòa
- `surrender_error`: Lỗi khi đầu hàng
- `join_error`: Lỗi khi join phòng
- `leave_error`: Lỗi khi rời phòng
- `kick_error`: Lỗi khi đuổi người chơi
- `start_error`: Lỗi khi bắt đầu game
- `chat_error`: Lỗi khi chat
- `game_state_error`: Lỗi khi lấy game state

### 9.2 Error Handling Strategy

- Tất cả handlers đều có try-catch
- Emit error event cho client khi có lỗi
- Log lỗi ra console để debug
- Không throw error để không crash server
- Cleanup resources khi có lỗi (lock, timer, etc.)

---

## 10. Performance & Optimization

### 10.1 Lock Mechanism
- Sử dụng `roomMoveLocks` để tránh race condition khi xử lý move
- Lock được giải phóng ngay sau khi xử lý xong hoặc khi có lỗi

### 10.2 Memory Management
- Game state chỉ lưu trong memory (không lưu DB)
- Game state được xóa khi game kết thúc
- Cleanup tất cả maps khi không cần thiết

### 10.3 Connection Management
- Giới hạn tối đa 2 socket connections cho mỗi user
- Tự động đóng các socket cũ nếu vượt quá giới hạn
- Ping/pong để giữ kết nối sống và phát hiện disconnect sớm

### 10.4 Timeout Management
- Turn timer: tự động kết thúc game nếu hết thời gian
- Ping timeout: tự động đẩy player ra nếu không ping
- Server ping timeout: tự động disconnect nếu không ping

---

## 11. Security Considerations

### 11.1 Authentication
- Tất cả kết nối đều phải xác thực JWT token
- Token được kiểm tra trong middleware `io.use()`

### 11.2 Authorization
- Kiểm tra quyền cho các action quan trọng:
  - `start_game`: Chỉ chủ phòng
  - `reset_game`: Chỉ chủ phòng
  - `kick_player`: Chỉ chủ phòng
  - `update_room_settings`: Chỉ chủ phòng

### 11.3 Input Validation
- Kiểm tra roomId, userId hợp lệ
- Kiểm tra vị trí (x, y) hợp lệ
- Kiểm tra tin nhắn không rỗng

---

## 12. Testing & Debugging

### 12.1 Logging
- Tất cả handlers đều có logging
- Sử dụng helper function `log()` để format log
- Log bao gồm: timestamp, event name, data

### 12.2 Debug Events
- Có thể emit `game_state` để kiểm tra trạng thái
- Có thể emit `room_update` để kiểm tra trạng thái phòng

---

## 13. Tổng Kết

Hệ thống Socket.IO backend được thiết kế để:
- Xử lý realtime game logic
- Quản lý phòng chơi và người chơi
- Xử lý chat realtime
- Duy trì kết nối ổn định
- Xử lý các edge cases (disconnect, timeout, etc.)

**Các điểm mạnh:**
- Code được tổ chức rõ ràng theo modules
- Có lock mechanism để tránh race condition
- Có timeout management để xử lý disconnect
- Có error handling đầy đủ
- Có logging để debug

**Các điểm cần cải thiện:**
- Friend socket module còn đơn giản, có thể mở rộng
- Có thể thêm rate limiting để tránh spam
- Có thể thêm metrics để monitor performance

---

**Tác giả:** NXHinh - 2025-01-27 -- Tạo với AI

