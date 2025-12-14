import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { friendApi } from '../../services/api/friendApi';
import { toast } from 'react-toastify';

const Friends = () => {
  const navigate = useNavigate();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('friends');
  const [loading, setLoading] = useState(false);
  
  const loadingFriendsRef = useRef(false);
  const loadingRequestsRef = useRef(false);
  const hasLoadedRef = useRef(false);
  const processingRequestRef = useRef(new Set());

  useEffect(() => {
    if (hasLoadedRef.current) {
      return;
    }
    hasLoadedRef.current = true;
    
    loadFriends();
    loadRequests();
  }, []);

  const loadFriends = async () => {
    if (loadingFriendsRef.current) {
      return;
    }
    
    loadingFriendsRef.current = true;
    try {
      setLoading(true);
      const response = await friendApi.getFriends();
      const data = response?.data || response || [];
      setFriends(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Lỗi khi tải danh sách bạn bè:', error);
      setFriends([]);
      if (error.response?.status !== 404) {
        toast.error('Không thể tải danh sách bạn bè');
      }
    } finally {
      setLoading(false);
      loadingFriendsRef.current = false;
    }
  };

  const loadRequests = async () => {
    // Tránh gọi trùng nếu đang load
    if (loadingRequestsRef.current) {
      return;
    }
    
    loadingRequestsRef.current = true;
    try {
      const response = await friendApi.getRequests();
      const data = response?.data || response || [];
      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Lỗi khi tải danh sách lời mời:', error);
      setRequests([]);
    } finally {
      loadingRequestsRef.current = false;
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      toast.warning('Vui lòng nhập nickname hoặc userID để tìm kiếm');
      return;
    }

    try {
      setLoading(true);
      const searchNickname = searchQuery.trim();
      const response = await friendApi.searchUser(searchNickname, null);
      const data = response?.data || response || [];
      setSearchResults(Array.isArray(data) ? data : []);
      setActiveTab('search');
      
      if (data.length === 0) {
        toast.info('Không tìm thấy người dùng nào');
      }
    } catch (error) {
      console.error('Lỗi khi tìm kiếm:', error);
      setSearchResults([]);
      toast.error(error.response?.data?.message || 'Không thể tìm kiếm');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (userId) => {
    if (processingRequestRef.current.has(userId)) {
      return;
    }
    
    processingRequestRef.current.add(userId);
    try {
      await friendApi.sendRequest(userId);
      toast.success('Đã gửi lời mời kết bạn');
      loadRequests();
      setSearchResults(prev => prev.map(u => 
        u._id === userId ? { ...u, friendStatus: 'pending' } : u
      ));
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể gửi lời mời');
    } finally {
      processingRequestRef.current.delete(userId);
    }
  };

  const handleAcceptRequest = async (requesterId) => {
    if (processingRequestRef.current.has(requesterId)) {
      return;
    }
    
    processingRequestRef.current.add(requesterId);
    try {
      await friendApi.acceptRequest(requesterId);
      toast.success('Đã chấp nhận lời mời kết bạn');
      loadFriends();
      loadRequests();
    } catch (error) {
      toast.error('Không thể chấp nhận lời mời');
    } finally {
      processingRequestRef.current.delete(requesterId);
    }
  };

  const handleCancelRequest = async (requesterId) => {
    if (processingRequestRef.current.has(requesterId)) {
      return;
    }
    
    processingRequestRef.current.add(requesterId);
    try {
      await friendApi.cancelRequest(requesterId);
      toast.success('Đã từ chối lời mời');
      loadRequests();
    } catch (error) {
      toast.error('Không thể từ chối lời mời');
    } finally {
      processingRequestRef.current.delete(requesterId);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (!window.confirm('Bạn có chắc muốn hủy kết bạn?')) return;

    if (processingRequestRef.current.has(friendId)) {
      return;
    }
    
    processingRequestRef.current.add(friendId);
    try {
      await friendApi.removeFriend(friendId);
      toast.success('Đã hủy kết bạn');
      loadFriends();
    } catch (error) {
      toast.error('Không thể hủy kết bạn');
    } finally {
      processingRequestRef.current.delete(friendId);
    }
  };

  const handleInviteToRoom = (friendId) => {
    navigate('/rooms/create', { state: { inviteFriendId: friendId } });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      online: { text: 'Online', color: 'bg-green-500' },
      offline: { text: 'Offline', color: 'bg-gray-500' },
      in_game: { text: 'Đang chơi', color: 'bg-blue-500' },
    };
    const statusInfo = statusMap[status] || statusMap.offline;
    return (
      <span className={`px-2 py-1 rounded-full text-xs text-white ${statusInfo.color}`}>
        {statusInfo.text}
      </span>
    );
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Bạn bè</h1>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo nickname hoặc userID..."
            className="flex-1 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm sm:text-base"
          >
            Tìm kiếm
          </button>
        </div>
      </form>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('friends')}
          className={`px-3 sm:px-4 py-2 font-semibold text-sm sm:text-base whitespace-nowrap ${
            activeTab === 'friends'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Bạn bè ({friends.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-3 sm:px-4 py-2 font-semibold text-sm sm:text-base whitespace-nowrap ${
            activeTab === 'requests'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Lời mời ({requests.length})
        </button>
        {searchResults.length > 0 && (
          <button
            onClick={() => setActiveTab('search')}
            className={`px-3 sm:px-4 py-2 font-semibold text-sm sm:text-base whitespace-nowrap ${
              activeTab === 'search'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Kết quả tìm kiếm ({searchResults.length})
          </button>
        )}
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        {activeTab === 'friends' && (
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="text-center py-8">Đang tải...</div>
            ) : friends.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm sm:text-base">
                Bạn chưa có bạn bè nào. Hãy tìm kiếm và gửi lời mời kết bạn!
              </div>
            ) : (
              <div className="space-y-3">
                {friends.map((friend) => (
                  <div
                    key={friend._id}
                    className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-white"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {friend.avatarUrl ? (
                          <img src={friend.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-400 text-sm sm:text-base">
                            {friend.nickname?.[0]?.toUpperCase() || friend.username?.[0]?.toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-semibold truncate text-sm sm:text-base">{friend.nickname || friend.username}</div>
                          {getStatusBadge(friend.status)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 flex-shrink-0">
                      <button
                        onClick={() => navigate(`/profile/${friend._id}`)}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs sm:text-sm whitespace-nowrap"
                        title="Xem profile"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => navigate(`/chat/${friend._id}`)}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm whitespace-nowrap"
                      >
                        Nhắn tin
                      </button>
                      <button
                        onClick={() => handleInviteToRoom(friend._id)}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm whitespace-nowrap"
                      >
                        Mời chơi
                      </button>
                      <button
                        onClick={() => handleRemoveFriend(friend._id)}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm whitespace-nowrap"
                      >
                        Hủy kết bạn
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="p-4 sm:p-6">
            {requests.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm sm:text-base">
                Không có lời mời kết bạn nào
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((request) => (
                  <div
                    key={request._id}
                    className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-white"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {request.requester?.avatarUrl ? (
                          <img src={request.requester.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-400 text-sm sm:text-base">
                            {request.requester?.nickname?.[0]?.toUpperCase() || request.requester?.username?.[0]?.toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-semibold truncate text-sm sm:text-base">{request.requester?.nickname || request.requester?.username}</div>
                          {request.requester?.status && getStatusBadge(request.requester.status)}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 flex-shrink-0">
                      <button
                        onClick={() => navigate(`/profile/${request.requester._id}`)}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs sm:text-sm whitespace-nowrap"
                        title="Xem profile"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => handleAcceptRequest(request.requester._id)}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm whitespace-nowrap"
                      >
                        Chấp nhận
                      </button>
                      <button
                        onClick={() => handleCancelRequest(request.requester._id)}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm whitespace-nowrap"
                      >
                        Từ chối
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'search' && (
          <div className="p-4 sm:p-6">
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm sm:text-base">
                Không tìm thấy người dùng nào
              </div>
            ) : (
              <div className="space-y-3">
                {searchResults.map((user) => (
                  <div
                    key={user._id}
                    className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 bg-white"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-gray-400 text-sm sm:text-base">
                            {user.nickname?.[0]?.toUpperCase() || user.username?.[0]?.toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="font-semibold truncate text-sm sm:text-base">{user.nickname || user.username}</div>
                          {user.status && getStatusBadge(user.status)}
                        </div>
                        {user.friendStatus && (
                          <div className="text-xs text-gray-400 mt-1">
                            {user.friendStatus === 'accepted' && 'Đã là bạn bè'}
                            {user.friendStatus === 'pending' && 'Đã gửi lời mời'}
                            {user.friendStatus === 'none' && 'Chưa kết bạn'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 flex-shrink-0">
                      <button
                        onClick={() => navigate(`/profile/${user._id}`)}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs sm:text-sm whitespace-nowrap"
                        title="Xem profile"
                      >
                        Profile
                      </button>
                      {user.friendStatus === 'accepted' ? (
                        <span className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-gray-600 text-xs sm:text-sm text-center whitespace-nowrap">Đã là bạn bè</span>
                      ) : user.friendStatus === 'pending' ? (
                        <span className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 text-yellow-600 text-xs sm:text-sm text-center whitespace-nowrap">Đã gửi lời mời</span>
                      ) : (
                        <button
                          onClick={() => handleSendRequest(user._id)}
                          className="flex-1 sm:flex-none px-3 sm:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm whitespace-nowrap"
                        >
                          Kết bạn
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Friends;
