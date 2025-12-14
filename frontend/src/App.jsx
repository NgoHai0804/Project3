import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AuthLayout from './layouts/AuthLayout';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ForgotPassword from './pages/Auth/ForgotPassword';
import Lobby from './pages/Lobby/Lobby';
import GameRoom from './pages/Game/GameRoom';
import CreateRoom from './pages/Rooms/CreateRoom';
import Profile from './pages/Profile/Profile';
import ViewProfile from './pages/Profile/ViewProfile';
import Friends from './pages/Friends/Friends';
import Leaderboard from './pages/Leaderboard/Leaderboard';
import Settings from './pages/Settings/Settings';
import PrivateChat from './pages/Chat/PrivateChat';

// Component bảo vệ route yêu cầu xác thực
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.user);
  return isAuthenticated ? children : <Navigate to="/auth/login" replace />;
};

function App() {
  return (
    <Routes>
      {/* Routes xác thực */}
      <Route path="/auth" element={<AuthLayout />}>
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="*" element={<Navigate to="/auth/login" replace />} />
      </Route>

      {/* Routes ứng dụng chính */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/lobby" replace />} />
        <Route path="lobby" element={<Lobby />} />
        <Route path="game/:id" element={<GameRoom />} />
        <Route path="rooms/create" element={<CreateRoom />} />
        <Route path="profile" element={<Profile />} />
        <Route path="profile/:userId" element={<ViewProfile />} />
        <Route path="friends" element={<Friends />} />
        <Route path="chat/:id" element={<PrivateChat />} />
        <Route path="leaderboard" element={<Leaderboard />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<div className="p-8 text-center">404 Not Found</div>} />
    </Routes>
  );
}

export default App;
