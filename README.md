# 🎮 Caro Online - Game Cờ Caro Trực Tuyến

Dự án web game cờ Caro online với đầy đủ tính năng realtime, hỗ trợ chơi người với người (P2P) và chơi với AI Bot, tích hợp hệ thống chat, bạn bè, và quản lý phòng chơi.

## 📋 Mục lục

- [Tổng quan](#tổng-quan)
- [Tính năng chính](#tính-năng-chính)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Cài đặt và chạy](#cài-đặt-và-chạy)
- [API Documentation](#api-documentation)
- [Socket Events](#socket-events)
- [Tính năng chi tiết](#tính-năng-chi-tiết)
- [Deployment](#deployment)
- [Tác giả](#tác-giả)

---

## 🎯 Tổng quan

**Caro Online** là một ứng dụng web game cờ Caro trực tuyến được xây dựng với kiến trúc full-stack hiện đại. Người chơi có thể:

- Chơi cờ Caro realtime với người chơi khác hoặc AI Bot
- Tạo và tham gia phòng chơi với nhiều tùy chọn
- Chat trực tuyến trong phòng và chat riêng
- Quản lý danh sách bạn bè
- Xem bảng xếp hạng và thống kê cá nhân
- Trải nghiệm giao diện đẹp mắt với animation và âm thanh

---

## ✨ Tính năng chính

### 🎲 Gameplay

#### Luật chơi
- **Cờ Caro chuẩn**: 5 quân liên tiếp theo hàng ngang, dọc hoặc chéo là thắng
- **Bàn cờ**: Kích thước linh hoạt (mặc định 15x15)
- **Lịch sử nước đi**: Hiển thị số thứ tự và cho phép xem lại các nước đi
- **Timer**: Giới hạn thời gian cho mỗi lượt đi (mặc định 30 giây)
- **Undo/Redo**: Chỉ áp dụng khi chơi với Bot (P2B mode)

#### Chế độ chơi
1. **Player to Player (P2P)**: Người chơi với người chơi
   - Hỗ trợ 2-4 người chơi trong một phòng
   - Realtime synchronization
   - Tự động xử lý khi người chơi rời phòng

2. **Player to Bot (P2B)**: Người chơi với AI Bot
   - 3 cấp độ khó: Dễ, Trung bình, Khó
   - Bot Dễ: "Giả ngu" để người chơi thắng dễ hơn
   - Bot Trung bình: Minimax với depth 2
   - Bot Khó: Minimax với depth 3
   - Hỗ trợ Undo/Redo khi chơi với Bot

#### Tính năng game
- ✅ Animation khi đặt quân cờ
- ✅ Sound effects và nhạc nền
- ✅ Hiển thị lượt đi hiện tại
- ✅ Xử lý thắng/thua/hòa
- ✅ Đầu hàng (Surrender)
- ✅ Đề nghị hòa (Draw request)
- ✅ Tự động kết thúc khi người chơi rời phòng
- ✅ Reconnect khi mất kết nối

### 🏠 Quản lý phòng

#### Tạo phòng
- Đặt tên phòng tùy chỉnh
- Đặt mật khẩu (tùy chọn)
- Chọn chế độ chơi (P2P hoặc P2B)
- Chọn độ khó Bot (nếu chơi P2B)
- Thiết lập giới hạn số người chơi (2-4 người)
- Thiết lập thời gian mỗi lượt đi

#### Tham gia phòng
- Xem danh sách phòng đang chờ
- Tìm kiếm phòng theo tên
- Lọc phòng theo trạng thái (waiting, playing, ended)
- Tham gia phòng có mật khẩu
- Matchmaking tự động (tìm đối thủ phù hợp)

#### Quản lý phòng
- Chủ phòng có quyền:
  - Kick người chơi
  - Thay đổi cài đặt phòng
  - Bắt đầu game khi đủ người
- Thông báo khi có người vào/ra phòng
- Trạng thái phòng: Waiting → Playing → Ended

### 💬 Hệ thống Chat

#### Chat trong phòng
- Chat realtime trong phòng chơi
- Hiển thị tên người gửi và thời gian
- Lưu lịch sử chat trong database
- Emoji và sticker (từ thư viện sẵn có)

#### Chat riêng
- Chat 1-1 với bạn bè
- Thông báo tin nhắn mới
- Lịch sử chat được lưu trữ
- Trạng thái đã đọc/chưa đọc

### 👥 Hệ thống bạn bè

#### Quản lý bạn bè
- Gửi lời mời kết bạn
- Chấp nhận/từ chối lời mời
- Xem danh sách bạn bè
- Xem trạng thái online/offline của bạn bè
- Xóa bạn bè
- Xem thông tin profile của bạn bè

#### Tính năng liên quan
- Mời bạn bè vào phòng chơi
- Thông báo realtime khi bạn bè online
- Thông báo khi nhận lời mời kết bạn

### 📊 Thống kê và Xếp hạng

#### Thống kê cá nhân
- Tổng số ván đã chơi
- Số ván thắng/thua
- Điểm số (Score/ELO)
- Thống kê theo từng game mode

#### Bảng xếp hạng
- Xếp hạng toàn server
- Xếp hạng bạn bè
- Top người chơi theo điểm số
- Lịch sử trận đấu

### 🔐 Xác thực và Bảo mật

#### Đăng ký/Đăng nhập
- Đăng ký tài khoản với email
- Xác thực email
- Đăng nhập với username/email và password
- JWT Token authentication (Access + Refresh Token)
- Quên mật khẩu với mã xác nhận 6 số

#### Bảo mật
- Mật khẩu được hash bằng bcrypt
- JWT token với expiration
- Socket.IO authentication
- CORS protection
- Input validation

### 🔔 Thông báo

#### Thông báo realtime
- Thông báo khi có lời mời kết bạn
- Thông báo khi bạn bè online
- Thông báo khi được mời vào phòng
- Thông báo khi có tin nhắn mới
- Thông báo kết quả trận đấu

---

## 🛠️ Công nghệ sử dụng

### Frontend
- **React 18**: UI framework
- **React Router DOM**: Routing
- **Redux Toolkit**: State management
- **Socket.IO Client**: Realtime communication
- **Axios**: HTTP client
- **Tailwind CSS**: Styling
- **Vite**: Build tool
- **React Icons**: Icon library
- **React Toastify**: Toast notifications

### Backend
- **Node.js**: Runtime environment
- **Express.js**: Web framework
- **Socket.IO**: Realtime bidirectional communication
- **MongoDB + Mongoose**: Database và ODM
- **JWT**: Authentication
- **bcrypt**: Password hashing
- **Winston**: Logging
- **Nodemailer/Resend**: Email service
- **Google APIs**: OAuth (nếu có)

### DevOps
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration
- **Nodemon**: Development hot reload

---

## 📁 Cấu trúc dự án

```
Project3/
├── backend/                    # Backend Node.js
│   ├── src/
│   │   ├── app.js             # Express app setup
│   │   ├── server.js          # Server entry point
│   │   ├── config/            # Configuration files
│   │   │   └── db.js          # MongoDB connection
│   │   ├── controllers/       # Route controllers
│   │   │   ├── auth.controller.js
│   │   │   ├── user.controller.js
│   │   │   ├── room.controller.js
│   │   │   ├── chat.controller.js
│   │   │   ├── friend.controller.js
│   │   │   └── bot.controller.js
│   │   ├── services/          # Business logic
│   │   │   ├── auth.service.js
│   │   │   ├── user.service.js
│   │   │   ├── room.service.js
│   │   │   ├── chat.service.js
│   │   │   ├── friend.service.js
│   │   │   ├── gameCaro.service.js
│   │   │   ├── bot.service.js
│   │   │   └── botMove.service.js
│   │   ├── models/            # Database models
│   │   │   ├── user.model.js
│   │   │   ├── room.model.js
│   │   │   ├── message.model.js
│   │   │   ├── friend.model.js
│   │   │   ├── gameCaro.model.js
│   │   │   └── notification.model.js
│   │   ├── routes/            # API routes
│   │   │   ├── auth.routes.js
│   │   │   ├── user.routes.js
│   │   │   ├── room.routes.js
│   │   │   ├── chat.routes.js
│   │   │   ├── friend.routes.js
│   │   │   └── bot.routes.js
│   │   ├── middlewares/       # Express middlewares
│   │   │   ├── auth.middleware.js
│   │   │   ├── error.middleware.js
│   │   │   └── validate.middleware.js
│   │   ├── sockets/           # Socket.IO handlers
│   │   │   ├── index.js       # Socket initialization
│   │   │   ├── chat.socket.js
│   │   │   ├── friend.socket.js
│   │   │   ├── game/          # Game socket handlers
│   │   │   │   ├── index.js
│   │   │   │   ├── move.js
│   │   │   │   ├── state.js
│   │   │   │   ├── timer.js
│   │   │   │   ├── draw.js
│   │   │   │   ├── surrender.js
│   │   │   │   └── bot.js
│   │   │   └── room/          # Room socket handlers
│   │   │       ├── index.js
│   │   │       ├── join.js
│   │   │       ├── leave.js
│   │   │       ├── invite.js
│   │   │       ├── kick.js
│   │   │       ├── ready.js
│   │   │       ├── start.js
│   │   │       ├── settings.js
│   │   │       └── reconnect.js
│   │   └── utils/             # Utility functions
│   │       ├── jwt.js
│   │       ├── logger.js
│   │       ├── response.js
│   │       ├── constants.js
│   │       ├── helpers.js
│   │       └── checkWinner.js
│   ├── logs/                  # Log files
│   ├── package.json
│   └── .env                   # Environment variables
│
├── frontend/                   # Frontend React
│   ├── src/
│   │   ├── main.jsx           # Entry point
│   │   ├── App.jsx            # Main app component
│   │   ├── index.css          # Global styles
│   │   ├── pages/             # Page components
│   │   │   ├── Auth/          # Authentication pages
│   │   │   │   ├── Login.jsx
│   │   │   │   ├── Register.jsx
│   │   │   │   └── ForgotPassword.jsx
│   │   │   ├── Lobby/         # Lobby page
│   │   │   │   ├── Lobby.jsx
│   │   │   │   └── components/
│   │   │   ├── Game/          # Game room page
│   │   │   │   └── GameRoom.jsx
│   │   │   ├── Rooms/         # Room management
│   │   │   │   └── CreateRoom.jsx
│   │   │   ├── Profile/       # User profile
│   │   │   │   ├── Profile.jsx
│   │   │   │   └── ViewProfile.jsx
│   │   │   ├── Friends/       # Friends page
│   │   │   │   └── Friends.jsx
│   │   │   ├── Chat/          # Chat page
│   │   │   │   └── PrivateChat.jsx
│   │   │   ├── Leaderboard/   # Leaderboard page
│   │   │   │   └── Leaderboard.jsx
│   │   │   └── Settings/      # Settings page
│   │   │       └── Settings.jsx
│   │   ├── components/        # Reusable components
│   │   │   ├── GameBoard/     # Game board component
│   │   │   ├── ChatBox/       # Chat component
│   │   │   ├── PlayerList/    # Player list component
│   │   │   ├── RoomCard/      # Room card component
│   │   │   └── ...
│   │   ├── layouts/           # Layout components
│   │   │   ├── AuthLayout.jsx
│   │   │   └── MainLayout.jsx
│   │   ├── hooks/             # Custom React hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useSocket.js
│   │   │   ├── useGameState.js
│   │   │   └── ...
│   │   ├── store/             # Redux store
│   │   │   ├── index.js
│   │   │   ├── userSlice.js
│   │   │   ├── gameSlice.js
│   │   │   ├── roomSlice.js
│   │   │   ├── chatSlice.js
│   │   │   └── notificationSlice.js
│   │   ├── services/          # API services
│   │   │   ├── api/           # REST API clients
│   │   │   │   ├── apiClient.js
│   │   │   │   ├── authApi.js
│   │   │   │   ├── userApi.js
│   │   │   │   ├── roomApi.js
│   │   │   │   ├── chatApi.js
│   │   │   │   └── friendApi.js
│   │   │   └── socket/        # Socket.IO clients
│   │   │       ├── socketClient.js
│   │   │       └── gameSocket.js
│   │   ├── config/            # Configuration
│   │   │   └── api.config.js
│   │   ├── utils/             # Utility functions
│   │   │   ├── tokenHelper.js
│   │   │   ├── storage.js
│   │   │   ├── constants.js
│   │   │   ├── checkWinner.js
│   │   │   └── soundManager.js
│   │   └── styles/            # CSS files
│   │       ├── global.css
│   │       ├── components.css
│   │       └── variables.css
│   ├── public/                # Static assets
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── docker-compose.yml         # Docker compose config
├── Dockerfile                 # Docker image config
└── README.md                  # This file
```

---

## 🚀 Cài đặt và chạy

### Yêu cầu hệ thống

- Node.js >= 18.x
- MongoDB >= 5.x
- npm hoặc yarn

### Cài đặt

#### 1. Clone repository

```bash
git clone <repository-url>
cd Project3
```

#### 2. Cài đặt Backend

```bash
cd backend
npm install
```

#### 3. Cài đặt Frontend

```bash
cd ../frontend
npm install
```

#### 4. Cấu hình môi trường

Tạo file `.env` trong thư mục `backend/`:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/caro-online

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d

# Email (cho quên mật khẩu)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend URL (cho CORS)
FRONTEND_URL=http://localhost:5173
```

Tạo file `.env` trong thư mục `frontend/`:

```env
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000
```

### Chạy ứng dụng

#### Development mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Ứng dụng sẽ chạy tại:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

#### Production mode

**Sử dụng Docker:**

```bash
docker-compose up -d
```

**Hoặc build và chạy thủ công:**

```bash
# Build frontend
cd frontend
npm run build

# Start backend
cd ../backend
npm start
```

---

## 📡 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### Đăng ký
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "string",
  "email": "string",
  "password": "string",
  "nickname": "string"
}
```

#### Đăng nhập
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "string",  // hoặc email
  "password": "string"
}
```

#### Quên mật khẩu
```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "string"
}
```

#### Reset mật khẩu
```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "string",
  "code": "string",  // 6 số
  "newPassword": "string"
}
```

### User Endpoints

#### Lấy thông tin user
```http
GET /api/users/profile
Authorization: Bearer <token>
```

#### Cập nhật profile
```http
PUT /api/users/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "nickname": "string",
  "avatarUrl": "string"
}
```

#### Lấy thống kê
```http
GET /api/users/stats
Authorization: Bearer <token>
```

### Room Endpoints

#### Lấy danh sách phòng
```http
GET /api/rooms?status=waiting&search=roomName
Authorization: Bearer <token>
```

#### Tạo phòng
```http
POST /api/rooms
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string",
  "password": "string",  // optional
  "maxPlayers": 2,
  "mode": "P2P" | "P2B",
  "botDifficulty": "easy" | "medium" | "hard",  // nếu mode = P2B
  "turnTimeLimit": 30
}
```

#### Lấy thông tin phòng
```http
GET /api/rooms/:roomId
Authorization: Bearer <token>
```

#### Cập nhật cài đặt phòng
```http
PUT /api/rooms/:roomId
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "string",
  "password": "string",
  "maxPlayers": 2,
  "turnTimeLimit": 30
}
```

### Friend Endpoints

#### Lấy danh sách bạn bè
```http
GET /api/friend
Authorization: Bearer <token>
```

#### Gửi lời mời kết bạn
```http
POST /api/friend/request
Authorization: Bearer <token>
Content-Type: application/json

{
  "userId": "string"
}
```

#### Chấp nhận lời mời
```http
POST /api/friend/accept/:requestId
Authorization: Bearer <token>
```

#### Từ chối lời mời
```http
POST /api/friend/reject/:requestId
Authorization: Bearer <token>
```

#### Xóa bạn bè
```http
DELETE /api/friend/:friendId
Authorization: Bearer <token>
```

### Chat Endpoints

#### Lấy lịch sử chat phòng
```http
GET /api/chat/room/:roomId
Authorization: Bearer <token>
```

#### Lấy lịch sử chat riêng
```http
GET /api/chat/private/:userId
Authorization: Bearer <token>
```

### Bot Endpoints

#### Tạo game với Bot
```http
POST /api/bot/create-game
Authorization: Bearer <token>
Content-Type: application/json

{
  "difficulty": "easy" | "medium" | "hard"
}
```

---

## 🔌 Socket Events

### Connection

#### Kết nối Socket
```javascript
socket = io(SOCKET_URL, {
  auth: {
    token: "your-jwt-token"
  }
});
```

### Game Events

#### Client → Server

| Event | Data | Mô tả |
|-------|------|-------|
| `get_game_state` | `{ roomId }` | Lấy trạng thái game hiện tại |
| `make_move` | `{ roomId, row, col }` | Đặt quân cờ |
| `undo_move` | `{ roomId }` | Hoàn tác nước đi (chỉ P2B) |
| `request_draw` | `{ roomId }` | Đề nghị hòa |
| `respond_draw` | `{ roomId, accept }` | Phản hồi đề nghị hòa |
| `surrender` | `{ roomId }` | Đầu hàng |
| `reset_game` | `{ roomId }` | Reset game |

#### Server → Client

| Event | Data | Mô tả |
|-------|------|-------|
| `game_state` | `{ board, turn, history, ... }` | Trạng thái game |
| `move_made` | `{ row, col, player, turn }` | Nước đi đã được đặt |
| `game_over` | `{ winner, reason }` | Game kết thúc |
| `draw_requested` | `{ from }` | Có đề nghị hòa |
| `draw_cancelled` | - | Đề nghị hòa bị hủy |
| `turn_timer` | `{ timeLeft }` | Thời gian còn lại |

### Room Events

#### Client → Server

| Event | Data | Mô tả |
|-------|------|-------|
| `join_room` | `{ roomId, password? }` | Tham gia phòng |
| `leave_room` | `{ roomId }` | Rời phòng |
| `create_room` | `{ name, password?, ... }` | Tạo phòng |
| `kick_player` | `{ roomId, userId }` | Kick người chơi |
| `toggle_ready` | `{ roomId }` | Bấm Ready |
| `start_game` | `{ roomId }` | Bắt đầu game |
| `update_room_settings` | `{ roomId, settings }` | Cập nhật cài đặt |

#### Server → Client

| Event | Data | Mô tả |
|-------|------|-------|
| `room_joined` | `{ room, players }` | Đã tham gia phòng |
| `player_joined` | `{ player }` | Có người vào phòng |
| `player_left` | `{ userId }` | Có người rời phòng |
| `player_ready` | `{ userId, isReady }` | Người chơi bấm Ready |
| `game_started` | `{ room, gameState }` | Game đã bắt đầu |
| `room_settings_updated` | `{ settings }` | Cài đặt đã cập nhật |

### Chat Events

#### Client → Server

| Event | Data | Mô tả |
|-------|------|-------|
| `send_message` | `{ roomId, message }` | Gửi tin nhắn trong phòng |
| `send_private_message` | `{ toUserId, message }` | Gửi tin nhắn riêng |

#### Server → Client

| Event | Data | Mô tả |
|-------|------|-------|
| `new_message` | `{ from, message, timestamp }` | Tin nhắn mới |
| `private_message` | `{ from, message, timestamp }` | Tin nhắn riêng |

### Friend Events

#### Server → Client

| Event | Data | Mô tả |
|-------|------|-------|
| `friend_online` | `{ userId }` | Bạn bè online |
| `friend_offline` | `{ userId }` | Bạn bè offline |
| `friend_request` | `{ from, requestId }` | Có lời mời kết bạn |
| `friend_accepted` | `{ userId }` | Lời mời được chấp nhận |
| `room_invite` | `{ from, roomId }` | Được mời vào phòng |

### System Events

| Event | Data | Mô tả |
|-------|------|-------|
| `ping_server` | - | Ping để giữ kết nối |
| `pong_server` | `{ time }` | Pong từ server |
| `error` | `{ message }` | Lỗi từ server |
| `disconnect` | - | Ngắt kết nối |

---

## 🎯 Tính năng chi tiết

### AI Bot

Bot sử dụng thuật toán **Minimax** với alpha-beta pruning để tính toán nước đi tối ưu.

#### Cấp độ Dễ
- Đôi khi chọn nước đi không tối ưu
- Dễ dàng để người chơi thắng
- Phù hợp cho người mới chơi

#### Cấp độ Trung bình
- Minimax với depth = 2
- Cân bằng giữa độ khó và tốc độ
- Phù hợp cho người chơi có kinh nghiệm

#### Cấp độ Khó
- Minimax với depth = 3
- Rất khó để thắng
- Phù hợp cho người chơi chuyên nghiệp

### Realtime Synchronization

- Tất cả nước đi được đồng bộ realtime qua Socket.IO
- Tự động reconnect khi mất kết nối
- Ping/pong để giữ kết nối sống
- Xử lý timeout và disconnect

### Game State Management

- Game state được lưu trong memory (có thể mở rộng với Redis)
- Hỗ trợ reconnect và khôi phục game state
- Lưu lịch sử game vào database sau khi kết thúc

### Security

- JWT token authentication
- Password hashing với bcrypt
- Input validation và sanitization
- CORS protection
- Rate limiting (có thể thêm)

---

## 🐳 Deployment

### Docker Deployment

#### Build image
```bash
docker build -t caro-online:latest .
```

#### Run với docker-compose
```bash
docker-compose up -d
```

#### Environment variables cho production
Tạo file `.env`:
```env
NODE_ENV=production
PORT=3000
MONGO_URI=mongodb://your-mongo-uri
JWT_SECRET=your-production-secret
JWT_EXPIRE=7d
FRONTEND_URL=https://your-frontend-url.com
```

### Manual Deployment

#### Backend
```bash
cd backend
npm install --production
npm start
```

#### Frontend
```bash
cd frontend
npm install
npm run build
# Serve dist/ folder với nginx hoặc serve static
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Cấu hình MongoDB production
- [ ] Set JWT_SECRET mạnh
- [ ] Cấu hình CORS đúng
- [ ] Enable HTTPS
- [ ] Setup logging
- [ ] Setup monitoring
- [ ] Backup database
- [ ] Setup CI/CD (optional)

---

## 📝 Ghi chú

### Performance

- Socket.IO connection pooling
- Database indexing
- Caching (có thể thêm Redis)
- Lazy loading components

### Mở rộng tương lai

- [ ] Voice chat (WebRTC)
- [ ] Mobile app (React Native)
- [ ] Nhiều biến thể game (6x6, 10x10)
- [ ] Tournament mode
- [ ] Spectator mode
- [ ] Replay system
- [ ] Advanced AI với machine learning

---

## 👨‍💻 Tác giả

Dự án được phát triển bởi nhóm sinh viên.

---

## 📄 License

MIT License

---

## 🙏 Lời cảm ơn

Cảm ơn tất cả các thư viện và công cụ mã nguồn mở đã giúp xây dựng dự án này.

---

**Chúc bạn chơi game vui vẻ! 🎮**

