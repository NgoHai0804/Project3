import React, { useState, useEffect, useCallback, useRef } from 'react';
import { userApi } from '../../services/api/userApi';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-toastify';
import { FaTrophy, FaCalendarAlt, FaChessBoard, FaChess, FaSpinner } from 'react-icons/fa';

const GameHistory = ({ userId = null, limit = 5 }) => {
  const { user: currentUser } = useAuth();
  // Hỗ trợ cả id và _id
  const currentUserId = userId || currentUser?._id || currentUser?.id;
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const loadingRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const loadGames = useCallback(async (page = 1) => {
    if (loadingRef.current) return;
    
    loadingRef.current = true;
    try {
      setLoading(true);
      const skip = (page - 1) * limit;
      
      const data = userId 
        ? await userApi.getUserGameHistory(userId, limit, skip)
        : await userApi.getGameHistory(limit, skip);
      
      if (data) {
        setGames(data.games || []);
        setTotal(data.total || 0);
        setCurrentPage(page);
      }
    } catch (error) {
      toast.error('Không thể tải lịch sử chơi');
      console.error('Lỗi khi tải game history:', error);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [userId, limit]);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadGames(1);
  }, []);

  const totalPages = Math.ceil(total / limit);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages && !loading) {
      loadGames(page);
    }
  };

  // So sánh 2 ID, hỗ trợ cả _id và id
  const compareIds = (id1, id2) => {
    if (!id1 || !id2) return false;
    const str1 = (id1._id || id1.id || id1)?.toString();
    const str2 = (id2._id || id2.id || id2)?.toString();
    return str1 === str2;
  };

  // Lấy ID từ object, hỗ trợ cả _id và id
  const getId = (obj) => {
    if (!obj) return null;
    return obj._id || obj.id || obj;
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      return dateString;
    }
  };

  const getResultText = (game, currentUserId) => {
    if (!game.winnerId) {
      return 'Hòa';
    }
    
    const playerXId = getId(game.playerX);
    const playerOId = getId(game.playerO);
    const winnerId = getId(game.winnerId);
    const currentId = getId(currentUserId);
    
    if (!currentId) {
      return 'Không xác định';
    }
    
    const isPlayerX = compareIds(playerXId, currentId);
    const isPlayerO = compareIds(playerOId, currentId);
    const isWinner = compareIds(winnerId, currentId);
    
    if (isWinner) {
      return 'Thắng';
    } else if (isPlayerX || isPlayerO) {
      return 'Thua';
    }
    return 'Không xác định';
  };

  const getResultColor = (game, currentUserId) => {
    if (!game.winnerId) {
      return 'text-gray-600 bg-gray-100';
    }
    
    const winnerId = getId(game.winnerId);
    const currentId = getId(currentUserId);
    const isWinner = compareIds(winnerId, currentId);
    
    if (isWinner) {
      return 'text-green-600 bg-green-100';
    }
    return 'text-red-600 bg-red-100';
  };

  const getOpponent = (game, currentUserId) => {
    const playerXId = getId(game.playerX);
    const playerOId = getId(game.playerO);
    const currentId = getId(currentUserId);
    
    if (!currentId) {
      return null;
    }
    
    const isPlayerX = compareIds(playerXId, currentId);
    const isPlayerO = compareIds(playerOId, currentId);
    
    if (isPlayerX) {
      return game.playerO;
    } else if (isPlayerO) {
      return game.playerX;
    }
    return null;
  };

  const getPlayerMark = (game, currentUserId) => {
    const playerXId = getId(game.playerX);
    const playerOId = getId(game.playerO);
    const currentId = getId(currentUserId);
    
    if (!currentId) {
      return null;
    }
    
    const isPlayerX = compareIds(playerXId, currentId);
    const isPlayerO = compareIds(playerOId, currentId);
    
    if (isPlayerX) return 'X';
    if (isPlayerO) return 'O';
    return null;
  };

  if (loading && games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-12">
        <FaSpinner className="animate-spin text-3xl sm:text-4xl text-blue-600 mb-3 sm:mb-4" />
        <div className="text-gray-600 text-sm sm:text-base md:text-lg">Đang tải lịch sử chơi...</div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 sm:py-12 px-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gray-100 flex items-center justify-center mb-3 sm:mb-4">
          <FaChessBoard className="text-2xl sm:text-3xl md:text-4xl text-gray-400" />
        </div>
        <div className="text-gray-600 text-sm sm:text-base md:text-lg font-medium mb-1 sm:mb-2 text-center">Chưa có lịch sử chơi nào</div>
        <div className="text-gray-500 text-xs sm:text-sm text-center">Hãy bắt đầu chơi để xem lịch sử của bạn!</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Danh sách game */}
      <div className="space-y-4">
        {games.map((game, index) => {
          const opponent = getOpponent(game, currentUserId);
          const playerMark = getPlayerMark(game, currentUserId);
          const resultText = getResultText(game, currentUserId);
          const resultColor = getResultColor(game, currentUserId);
          const isWin = resultText === 'Thắng';
          const isDraw = resultText === 'Hòa';
          
          return (
            <div
              key={game._id}
              className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 hover:shadow-md sm:hover:shadow-lg hover:border-blue-300 transition-all duration-300 overflow-hidden"
            >
              <div className="p-3 sm:p-4 md:p-5">
                {/* Header: Đối thủ và kết quả */}
                <div className="flex items-center justify-between gap-3 mb-3 sm:mb-0 sm:pb-3 sm:border-b sm:border-gray-100">
                  {/* Thông tin đối thủ */}
                  <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                    {opponent ? (
                      <>
                        <div className="relative flex-shrink-0">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm sm:shadow-md">
                            {opponent.avatarUrl ? (
                              <img
                                src={opponent.avatarUrl}
                                alt={opponent.nickname || 'Đối thủ'}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-white font-bold text-sm sm:text-base md:text-lg">
                                {(opponent.nickname || 'Đ')?.[0]?.toUpperCase()}
                              </span>
                            )}
                          </div>
                          {isWin && (
                            <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                              <FaTrophy className="text-yellow-800 text-[8px] sm:text-[10px] md:text-xs" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-gray-900 text-sm sm:text-base md:text-lg truncate">
                            {opponent.nickname || 'Đối thủ'}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-gray-500 text-xs sm:text-sm">Không xác định đối thủ</div>
                    )}
                  </div>
                  
                  {/* Badge kết quả */}
                  <div className="flex-shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-full text-[10px] sm:text-xs md:text-sm font-semibold shadow-sm ${
                      isWin 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' 
                        : isDraw
                        ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white'
                        : 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
                    }`}>
                      {isWin && <FaTrophy className="text-[8px] sm:text-[10px] md:text-xs" />}
                      <span className="whitespace-nowrap">{resultText}</span>
                    </span>
                  </div>
                </div>
                
                {/* Thông tin chi tiết - responsive wrap */}
                <div className="flex items-center flex-wrap gap-2 sm:gap-3 md:gap-4 pt-3 border-t border-gray-100">
                  {playerMark && (
                    <div className={`
                      w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center
                      font-bold text-[10px] sm:text-xs md:text-sm shadow-sm sm:shadow-md transition-all flex-shrink-0
                      ${playerMark === 'X' 
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white ring-1 sm:ring-2 ring-blue-200' 
                        : 'bg-gradient-to-br from-red-500 to-red-600 text-white ring-1 sm:ring-2 ring-red-200'}
                    `}>
                      {playerMark}
                    </div>
                  )}
                  <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs md:text-sm text-gray-600">
                    <FaChessBoard className="text-amber-500 flex-shrink-0 text-[10px] sm:text-xs md:text-sm" />
                    <span className="whitespace-nowrap">{game.boardSize}×{game.boardSize}</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs md:text-sm text-gray-600">
                    <FaChess className="text-purple-500 flex-shrink-0 text-[10px] sm:text-xs md:text-sm" />
                    <span className="whitespace-nowrap">{game.moves?.length || 0} nước đi</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs md:text-sm text-gray-600 min-w-0">
                    <FaCalendarAlt className="text-blue-500 flex-shrink-0 text-[10px] sm:text-xs md:text-sm" />
                    <span className="truncate">{formatDate(game.startedAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 sm:gap-2 pt-2 sm:pt-4">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={loading || currentPage === 1}
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium"
          >
            <span className="hidden sm:inline">Trước</span>
            <span className="sm:hidden">‹</span>
          </button>
          
          <div className="flex items-center gap-0.5 sm:gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
              // Hiển thị tối đa 5 số trang
              if (totalPages <= 5) {
                return (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    disabled={loading}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {page}
                  </button>
                );
              } else {
                // Logic hiển thị trang thông minh
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      disabled={loading}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-1 sm:px-2 text-gray-400 text-xs sm:text-sm">...</span>;
                }
                return null;
              }
            })}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={loading || currentPage === totalPages}
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm font-medium"
          >
            <span className="hidden sm:inline">Sau</span>
            <span className="sm:hidden">›</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default GameHistory;
