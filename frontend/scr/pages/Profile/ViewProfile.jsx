import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { userApi } from '../../services/api/userApi';
import { friendApi } from '../../services/api/friendApi';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-toastify';

const ViewProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState('none');
  const [isRequester, setIsRequester] = useState(false);
  const [isAddressee, setIsAddressee] = useState(false);
  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  
  const loadingProfileRef = useRef(false);
  const loadingFriendStatusRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const currentUserIdRef = useRef(null);
  const processingRequestRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      return;
    }
    
    if (currentUserIdRef.current !== userId) {
      hasLoadedRef.current = false;
      currentUserIdRef.current = userId;
    }
    
    if (hasLoadedRef.current) {
      return;
    }
    
    hasLoadedRef.current = true;
    loadProfile();
    checkFriendStatus();
  }, [userId]);

  const loadProfile = async () => {
    // Tránh gọi trùng nếu đang load
    if (loadingProfileRef.current) {
      return;
    }
    
    loadingProfileRef.current = true;
    try {
      setLoading(true);
      const data = await userApi.getUserProfile(userId);
      setProfile(data);
    } catch (error) {
      toast.error('Không thể tải thông tin profile');
      console.error('Lỗi khi tải profile:', error);
      navigate('/friends');
    } finally {
      setLoading(false);
      loadingProfileRef.current = false;
    }
  };

  const checkFriendStatus = async () => {
    // Tránh gọi trùng nếu đang load
    if (loadingFriendStatusRef.current) {
      return;
    }
    
    loadingFriendStatusRef.current = true;
    try {
      const response = await friendApi.searchUser(null, userId);
      const users = response?.data || response || [];
      if (users.length > 0) {
        const userData = users[0];
        if (userData.friendStatus) {
          setFriendStatus(userData.friendStatus);
        }
        // Xác định ai là người gửi, ai là người nhận
        setIsRequester(userData.isRequester || false);
        setIsAddressee(userData.isAddressee || false);
      }
    } catch (error) {
      console.error('Lỗi khi kiểm tra trạng thái bạn bè:', error);
    } finally {
      loadingFriendStatusRef.current = false;
    }
  };

  const handleSendRequest = async () => {
    // Tránh gọi trùng nếu đang xử lý
    if (processingRequestRef.current || isLoadingStatus) {
      return;
    }
    
    processingRequestRef.current = true;
    setIsLoadingStatus(true);
    try {
      await friendApi.sendRequest(userId);
      setFriendStatus('pending');
      setIsRequester(true);
      setIsAddressee(false);
      toast.success('Đã gửi lời mời kết bạn');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể gửi lời mời');
    } finally {
      setIsLoadingStatus(false);
      processingRequestRef.current = false;
    }
  };

  const handleAcceptRequest = async () => {
    // Tránh gọi trùng nếu đang xử lý
    if (processingRequestRef.current || isLoadingStatus) {
      return;
    }
    
    processingRequestRef.current = true;
    setIsLoadingStatus(true);
    try {
      // userId là người gửi, current user là người nhận
      await friendApi.acceptRequest(userId);
      setFriendStatus('accepted');
      setIsRequester(false);
      setIsAddressee(false);
      toast.success('Đã chấp nhận lời mời kết bạn');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể chấp nhận lời mời');
    } finally {
      setIsLoadingStatus(false);
      processingRequestRef.current = false;
    }
  };

  const handleChat = () => {
    navigate(`/chat/${userId}`);
  };

  const getGameStats = () => {
    if (!profile?.gameStats || profile.gameStats.length === 0) {
      return { totalGames: 0, totalWin: 0, totalLose: 0, score: 0 };
    }
    const caroStats = profile.gameStats.find(s => s.gameId === 'caro') || profile.gameStats[0];
    return {
      totalGames: caroStats.totalGames || 0,
      totalWin: caroStats.totalWin || 0,
      totalLose: caroStats.totalLose || 0,
      score: caroStats.score || 0,
    };
  };

  const stats = getGameStats();
  const winRate = stats.totalGames > 0 ? ((stats.totalWin / stats.totalGames) * 100).toFixed(1) : 0;
  const isMyProfile = currentUser?.id === userId || currentUser?._id === userId;

  if (loading) {
    return (
      <div className="p-4 sm:p-8">
        <div className="text-center">Đang tải...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-4 sm:p-8">
        <div className="text-center text-red-500 text-sm sm:text-base">Không tìm thấy profile</div>
        <button
          onClick={() => navigate('/friends')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
        >
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-4">
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 hover:text-blue-800 text-sm sm:text-base"
        >
          ← Quay lại
        </button>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Hồ sơ người dùng</h1>

      <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 border-4 border-gray-300">
            {profile?.avatarUrl ? (
              <img 
                src={profile.avatarUrl} 
                alt="Avatar" 
                className="w-full h-full object-cover"
                style={{ objectPosition: 'center' }}
              />
            ) : (
              <span className="text-5xl sm:text-6xl text-gray-400">
                {profile?.nickname?.[0]?.toUpperCase() || profile?.username?.[0]?.toUpperCase() || 'U'}
              </span>
            )}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h2 className="text-2xl font-bold">{profile?.nickname || (isMyProfile ? profile?.username : 'Người dùng')}</h2>
            {isMyProfile && profile?.email && <p className="text-gray-500 text-sm">{profile.email}</p>}
          </div>
          {!isMyProfile && (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {friendStatus === 'accepted' ? (
                <>
                  <button
                    onClick={handleChat}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
                  >
                    Nhắn tin
                  </button>
                </>
              ) : friendStatus === 'pending' && isAddressee ? (
                <button
                  onClick={handleAcceptRequest}
                  disabled={isLoadingStatus}
                  className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-sm sm:text-base"
                >
                  Chấp nhận lời mời
                </button>
              ) : friendStatus === 'pending' && isRequester ? (
                // Nếu current user là người gửi, hiển thị trạng thái "Đã gửi lời mời"
                <button
                  disabled
                  className="w-full sm:w-auto px-4 py-2 bg-gray-400 text-white rounded-lg cursor-not-allowed text-sm sm:text-base"
                >
                  Đã gửi lời mời
                </button>
              ) : (
                <button
                  onClick={handleSendRequest}
                  disabled={isLoadingStatus}
                  className="w-full sm:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm sm:text-base"
                >
                  Kết bạn
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-blue-50 p-3 sm:p-4 rounded-lg">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">{stats.totalGames}</div>
            <div className="text-xs sm:text-sm text-gray-600">Tổng ván</div>
          </div>
          <div className="bg-green-50 p-3 sm:p-4 rounded-lg">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{stats.totalWin}</div>
            <div className="text-xs sm:text-sm text-gray-600">Thắng</div>
          </div>
          <div className="bg-red-50 p-3 sm:p-4 rounded-lg">
            <div className="text-xl sm:text-2xl font-bold text-red-600">{stats.totalLose}</div>
            <div className="text-xs sm:text-sm text-gray-600">Thua</div>
          </div>
          <div className="bg-yellow-50 p-3 sm:p-4 rounded-lg">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">{winRate}%</div>
            <div className="text-xs sm:text-sm text-gray-600">Tỷ lệ thắng</div>
          </div>
        </div>

        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
          <h3 className="font-semibold mb-2 text-sm sm:text-base">Điểm số</h3>
          <div className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.score}</div>
        </div>
      </div>
    </div>
  );
};

export default ViewProfile;

