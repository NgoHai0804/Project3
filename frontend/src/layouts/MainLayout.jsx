import React, { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../hooks/useSocket';
import { useNotifications } from '../hooks/useNotifications';
import NotificationBell from '../components/Navbar/NotificationBell';
import { roomApi } from '../services/api/roomApi';

const MainLayout = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [hasCheckedRoom, setHasCheckedRoom] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const checkingRoomRef = useRef(false); // Flag để tránh gọi checkUserRoom nhiều lần cùng lúc
  useSocket(); // Khởi tạo kết nối socket
  useNotifications(); // Khởi tạo listener thông báo

  // Kiểm tra user có đang trong phòng nào không khi đăng nhập
  // Bỏ qua check nếu đang ở lobby vì Lobby sẽ tự xử lý song song với load list
  useEffect(() => {
    const checkUserRoom = async () => {
      // Bỏ qua nếu đang ở lobby - Lobby sẽ tự xử lý check-user-room song song với load list
      if (location.pathname === '/lobby' || location.pathname === '/') {
        return;
      }
      
      // Chỉ kiểm tra nếu đã đăng nhập và chưa kiểm tra và không đang check
      if (!isAuthenticated || hasCheckedRoom || location.pathname.startsWith('/game/') || checkingRoomRef.current) {
        return;
      }

      checkingRoomRef.current = true;
      try {
        const result = await roomApi.checkUserRoom();
        
        if (result?.inRoom && result?.room?._id) {
          // Tự động chuyển đến phòng nếu user đang ở trong phòng
          navigate(`/game/${result.room._id}`, { replace: true });
        }
      } catch (error) {
        console.error('Lỗi khi kiểm tra phòng của user:', error);
      } finally {
        setHasCheckedRoom(true);
        checkingRoomRef.current = false;
      }
    };

    checkUserRoom();
  }, [isAuthenticated, hasCheckedRoom, location.pathname, navigate]);

  // Đóng sidebar khi chuyển trang trên mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Kiểm tra route đang active
  const isActive = (path) => {
    if (path === '/lobby') {
      return location.pathname === '/' || location.pathname === '/lobby';
    }
    return location.pathname.startsWith(path);
  };

  // Lấy class cho menu item
  const getMenuItemClasses = (path) => {
    const baseClasses = "block px-4 py-3 text-gray-800 rounded-lg transition-all duration-200 font-medium flex items-center gap-3";
    const activeClasses = isActive(path)
      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md transform scale-[1.02]"
      : "hover:bg-gradient-to-r hover:from-blue-50 hover:to-blue-100 hover:text-blue-700 hover:shadow-sm";
    return `${baseClasses} ${activeClasses}`;
  };

  // Hàm điều hướng đến lobby (để Lobby tự xử lý check-user-room song song với load list)
  const handleNavigateToLobby = (e) => {
    e?.preventDefault();
    
    // Navigate ngay đến lobby, để Lobby tự xử lý check-user-room song song với load list
    // Điều này giúp tránh lag khi bấm logo hoặc refresh
    if (location.pathname === '/lobby' || location.pathname === '/') {
      // Đã ở lobby rồi, trigger refresh bằng cách navigate lại
      // Lobby sẽ tự động gọi loadRooms() song song với check-user-room
      navigate('/lobby', { replace: true });
      // Force re-render bằng cách thay đổi key hoặc trigger event
      window.dispatchEvent(new Event('lobby-refresh'));
    } else {
      navigate('/lobby');
    }
  };

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Navbar */}
      <nav className="bg-gradient-to-r from-white via-blue-50 to-white shadow-lg border-b border-blue-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              {/* Mobile menu button - chỉ hiển thị trên mobile (nhỏ hơn sm: 640px) */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="sm:hidden p-2 rounded-lg text-blue-700 hover:bg-blue-100 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                aria-label="Toggle menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  {sidebarOpen ? (
                    <path d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
              <button
                onClick={handleNavigateToLobby}
                className="flex items-center gap-1 sm:gap-1.5 hover:opacity-80 transition-opacity duration-200 cursor-pointer"
              >
                <img 
                  src="/logo.svg" 
                  alt="Caro Online Logo" 
                  className="h-8 sm:h-10 w-auto"
                />
                <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent hover:from-blue-700 hover:to-blue-900 transition-all duration-200">
                  Caro Online
                </span>
              </button>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              {user ? (
                <>
                  <NotificationBell />
                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Avatar */}
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center overflow-hidden flex-shrink-0 ring-2 ring-white shadow-md">
                      {user.avatarUrl ? (
                        <img 
                          src={user.avatarUrl} 
                          alt="Avatar" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <span className="text-sm sm:text-lg font-bold text-white">
                          {(user.nickname || user.username)?.[0]?.toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                    <span className="hidden sm:inline text-gray-800 text-sm sm:text-base font-medium">
                      Xin chào, <span className="text-blue-600 font-semibold">{user.nickname || user.username}</span>
                    </span>
                  </div>
                </>
              ) : (
                <Link
                  to="/auth/login"
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 text-sm sm:text-base font-medium shadow-md hover:shadow-lg transform hover:scale-105"
                >
                  Đăng nhập
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar and Main Content */}
      <div className="flex">
        {/* Desktop Sidebar - Luôn hiển thị trên PC (sm: 640px+) */}
        <aside className="sidebar-desktop hidden sm:flex w-64 flex-shrink-0 bg-white shadow-lg border-r border-blue-200 min-h-[calc(100vh-4rem)] flex-col">
          <nav className="p-4 space-y-2">
            <button
              onClick={handleNavigateToLobby}
              className={getMenuItemClasses('/lobby') + " w-full text-left"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Sảnh chờ</span>
            </button>
            <Link
              to="/friends"
              className={getMenuItemClasses('/friends')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Bạn bè</span>
            </Link>
            <Link
              to="/profile"
              className={getMenuItemClasses('/profile')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Hồ sơ</span>
            </Link>
            <Link
              to="/leaderboard"
              className={getMenuItemClasses('/leaderboard')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <span>Bảng xếp hạng</span>
            </Link>
            <Link
              to="/settings"
              className={getMenuItemClasses('/settings')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Cài đặt</span>
            </Link>
          </nav>
        </aside>

        {/* Mobile Sidebar */}
        <aside
          className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white shadow-2xl border-r border-blue-200 z-50 transform transition-transform duration-300 ease-in-out sm:hidden ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="p-4 space-y-2">
            <button
              onClick={(e) => {
                setSidebarOpen(false);
                handleNavigateToLobby(e);
              }}
              className={getMenuItemClasses('/lobby') + " w-full text-left"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>Sảnh chờ</span>
            </button>
            <Link
              to="/friends"
              className={getMenuItemClasses('/friends')}
              onClick={() => setSidebarOpen(false)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>Bạn bè</span>
            </Link>
            <Link
              to="/profile"
              className={getMenuItemClasses('/profile')}
              onClick={() => setSidebarOpen(false)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Hồ sơ</span>
            </Link>
            <Link
              to="/leaderboard"
              className={getMenuItemClasses('/leaderboard')}
              onClick={() => setSidebarOpen(false)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
              <span>Bảng xếp hạng</span>
            </Link>
            <Link
              to="/settings"
              className={getMenuItemClasses('/settings')}
              onClick={() => setSidebarOpen(false)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Cài đặt</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
