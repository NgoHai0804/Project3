import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../../services/api/userApi';
import { toast } from 'react-toastify';

const Leaderboard = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const loadingLeaderboardRef = useRef(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) {
      return;
    }
    
    hasLoadedRef.current = true;
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    // Tránh gọi trùng nếu đang load
    if (loadingLeaderboardRef.current) {
      return;
    }
    
    loadingLeaderboardRef.current = true;
    try {
      setLoading(true);
      const data = await userApi.getLeaderboard('caro');
      if (Array.isArray(data)) {
        setLeaderboard(data);
      } else if (data && Array.isArray(data.data)) {
        setLeaderboard(data.data);
      } else if (data && typeof data === 'object') {
        setLeaderboard([]);
        console.warn('Leaderboard data không phải array:', data);
      } else {
        setLeaderboard([]);
      }
    } catch (error) {
      toast.error('Không thể tải bảng xếp hạng');
      console.error('Lỗi khi tải bảng xếp hạng:', error);
      setLeaderboard([]);
    } finally {
      setLoading(false);
      loadingLeaderboardRef.current = false;
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-8">
        <div className="text-center">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Bảng xếp hạng</h1>

      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hạng
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Người chơi
                </th>
                <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Điểm
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!Array.isArray(leaderboard) || leaderboard.length === 0 ? (
                <tr>
                  <td colSpan="3" className="px-3 sm:px-6 py-4 text-center text-gray-500 text-sm sm:text-base">
                    Chưa có dữ liệu xếp hạng
                  </td>
                </tr>
              ) : (
                leaderboard.map((player, index) => {
                  const userId = player._id || player.userId || player.id;
                  
                  // Xác định màu sắc cho top 3
                  const getRankColor = () => {
                    if (index === 0) return 'text-yellow-600'; // Top 1 - Vàng
                    if (index === 1) return 'text-gray-600'; // Top 2 - Bạc
                    if (index === 2) return 'text-orange-600'; // Top 3 - Đồng
                    return 'text-gray-600'; // Các vị trí khác
                  };
                  
                  const getRowBgColor = () => {
                    if (index === 0) return 'bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 hover:from-yellow-100 hover:via-amber-100 hover:to-yellow-100 border-l-4 border-yellow-500 shadow-md'; // Top 1 - Gradient vàng
                    if (index === 1) return 'bg-gradient-to-r from-slate-100 via-gray-100 to-slate-100 hover:from-slate-200 hover:via-gray-200 hover:to-slate-200 border-l-4 border-slate-500 shadow-md'; // Top 2 - Gradient bạc đẹp hơn
                    if (index === 2) return 'bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 hover:from-orange-100 hover:via-amber-100 hover:to-orange-100 border-l-4 border-orange-500 shadow-md'; // Top 3 - Gradient đồng
                    return 'bg-white hover:bg-gray-50'; // Các vị trí khác
                  };
                  
                  return (
                    <tr 
                      key={player._id || index} 
                      className={`${getRowBgColor()} cursor-pointer transition-colors`}
                      onClick={() => {
                        if (userId) {
                          navigate(`/profile/${userId}`);
                        }
                      }}
                    >
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`text-base sm:text-lg font-bold ${getRankColor()}`}>
                            #{index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mr-2 sm:mr-3 flex-shrink-0">
                            {player.avatarUrl ? (
                              <img src={player.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs sm:text-sm text-gray-400">
                                {player.nickname?.[0]?.toUpperCase() || player.username?.[0]?.toUpperCase() || 'U'}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                              {player.nickname || player.username}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <div className={`text-base sm:text-lg font-bold ${index < 3 ? getRankColor() : 'text-blue-600'}`}>
                          {player.score || 0}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
