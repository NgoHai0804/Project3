import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { gameSocket } from '../../services/socket/gameSocket';
import KickPlayerModal from '../KickPlayerModal/KickPlayerModal';

// Lấy ELO từ dữ liệu người dùng
const getEloScore = (userData) => {
  if (!userData?.gameStats || userData.gameStats.length === 0) {
    return 1000; // ELO mặc định
  }
  const caroStats = userData.gameStats.find(s => s.gameId === 'caro') || userData.gameStats[0];
  return caroStats?.score || 1000;
};

const PlayerList = ({ playerMarks = {}, currentRoom, isHost, roomId, isPlaying = false }) => {
  const { players, currentPlayerIndex } = useSelector((state) => state.game);
  const { user } = useSelector((state) => state.user);
  const [showKickModal, setShowKickModal] = useState(false);
  const [targetPlayerToKick, setTargetPlayerToKick] = useState(null);

  const handleKickPlayer = (targetUserId) => {
    if (!roomId || !isHost) return;
    
    const targetPlayer = players.find(p => p.userId?.toString() === targetUserId?.toString());
    if (!targetPlayer) return;

    // Mở modal xác nhận
    setTargetPlayerToKick(targetPlayer);
    setShowKickModal(true);
  };

  const handleConfirmKick = () => {
    if (targetPlayerToKick && roomId) {
      gameSocket.kickPlayer(roomId, targetPlayerToKick.userId);
      setShowKickModal(false);
      setTargetPlayerToKick(null);
    }
  };

  const handleCancelKick = () => {
    setShowKickModal(false);
    setTargetPlayerToKick(null);
  };

  if (!players || players.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md pt-2 sm:pt-3 px-4 sm:px-5 pb-4 sm:pb-5 max-h-[400px] sm:max-h-[450px]">
        <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 text-gray-800 border-b border-gray-200 pb-2">
          Người chơi
        </h3>
        <div className="flex items-center justify-center py-8">
          <p className="text-gray-400 text-sm sm:text-base">Chưa có người chơi</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modal xác nhận đuổi người chơi */}
      <KickPlayerModal
        isOpen={showKickModal}
        onClose={handleCancelKick}
        onConfirm={handleConfirmKick}
        playerName={targetPlayerToKick?.nickname || targetPlayerToKick?.username || 'người chơi này'}
      />

      <div className="bg-white rounded-lg shadow-md pt-2 sm:pt-3 px-4 sm:px-5 pb-4 sm:pb-5 flex flex-col max-h-[400px] sm:max-h-[450px]">
        <h3 className="text-sm sm:text-base font-semibold mb-2 sm:mb-3 text-gray-800 border-b border-gray-200 pb-2 flex-shrink-0">
          Người chơi <span className="text-gray-500 font-normal">({players.length})</span>
        </h3>
        <div className="space-y-2 sm:space-y-2.5 overflow-y-auto flex-1 min-h-0">
        {players.map((player, index) => {
          const isCurrentPlayer = index === currentPlayerIndex;
          const isMe = user?.id === player.userId || user?._id === player.userId?.toString();
          const isBot = player.userId === 'BOT_CARO_AI' || player.username === 'Bot AI' || player.userId?.toString() === 'BOT_CARO_AI';
          
          // Lấy ELO: nếu là người dùng hiện tại thì lấy từ user store, nếu không thì từ dữ liệu player (nếu có)
          // Bot không có ELO
          const eloScore = isBot ? null : (isMe 
            ? getEloScore(user) 
            : (player.elo || player.score || null));
          
          return (
            <div
              key={player.userId || index}
              className={`
                rounded-lg border-2 transition-all flex items-center overflow-hidden
                shadow-sm hover:shadow-md
                ${isCurrentPlayer 
                  ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-blue-100/50 ring-2 ring-blue-200' 
                  : 'border-gray-300 bg-white hover:border-gray-400'}
                ${isMe && !isCurrentPlayer ? 'bg-gradient-to-r from-green-50 to-green-100/50' : ''}
              `}
            >
              <div className="flex items-center gap-1.5 sm:gap-2 flex-1 p-1.5 sm:p-2 min-w-0">
                {/* Ảnh đại diện */}
                <div className="relative flex-shrink-0">
                  <div className={`
                    w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center overflow-hidden
                    ring-2 ${isCurrentPlayer ? 'ring-blue-400' : 'ring-gray-200'}
                    ${isMe ? 'ring-green-400' : ''}
                  `}>
                    {player.avatarUrl ? (
                      <img 
                        src={player.avatarUrl} 
                        alt="Avatar" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className={`
                        text-xs sm:text-sm font-bold
                        ${isCurrentPlayer ? 'text-blue-700' : isMe ? 'text-green-700' : 'text-gray-600'}
                      `}>
                        {(player.nickname || player.username)?.[0]?.toUpperCase() || '?'}
                      </span>
                    )}
                  </div>
                  {/* Badge chủ phòng */}
                  {player.isHost && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 sm:w-5 sm:h-5 bg-yellow-500 rounded-full flex items-center justify-center ring-2 ring-white shadow-md">
                      <svg 
                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-white" 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className={`
                      font-semibold text-xs sm:text-sm truncate
                      ${isCurrentPlayer ? 'text-blue-700' : isMe ? 'text-green-700' : 'text-gray-800'}
                    `}>
                      {player.nickname || player.username || 'Unknown'}
                    </p>
                    {isBot && (
                      <span className="px-1 py-0.5 text-[10px] sm:text-xs font-medium text-purple-700 bg-purple-100 rounded-md flex-shrink-0">
                        Bot
                      </span>
                    )}
                    {isMe && !isBot && (
                      <span className="px-1 py-0.5 text-[10px] sm:text-xs font-medium text-green-700 bg-green-100 rounded-md flex-shrink-0">
                        Bạn
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {eloScore !== null && (
                      <span className="px-1.5 py-0.5 text-[10px] sm:text-xs font-semibold text-purple-700 bg-purple-100 rounded-full">
                        ELO: {eloScore}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {/* Nút đuổi và ký hiệu game */}
              <div className="flex items-center gap-1.5 px-1.5 sm:px-2 flex-shrink-0">
                {/* Nút đuổi - chỉ hiển thị cho chủ phòng, không phải chính mình, không phải bot và chưa bắt đầu game */}
                {isHost && !isMe && !isBot && roomId && !isPlaying && (
                  <button
                    onClick={() => handleKickPlayer(player.userId)}
                    className="
                      flex items-center justify-center 
                      w-7 h-7 sm:w-8 sm:h-8 rounded-lg
                      bg-red-50 text-red-600 hover:text-white hover:bg-red-600
                      border-2 border-red-600 hover:border-red-700
                      transition-all duration-200
                      active:scale-95
                      shadow-sm hover:shadow-md
                    "
                    title="Đuổi người chơi"
                  >
                    <svg 
                      className="w-3 h-3 sm:w-3.5 sm:h-3.5" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" 
                      />
                    </svg>
                  </button>
                )}
                
                {/* Ký hiệu game - Badge tròn đẹp mắt */}
                {playerMarks[player.userId?.toString()] && (
                  <div className={`
                    w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center
                    font-bold text-xs sm:text-sm shadow-md transition-all
                    ${playerMarks[player.userId?.toString()] === 'X' 
                      ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white ring-2 ring-blue-200' 
                      : 'bg-gradient-to-br from-red-500 to-red-600 text-white ring-2 ring-red-200'}
                  `}>
                    {playerMarks[player.userId?.toString()]}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        </div>
      </div>
    </>
  );
};

export default PlayerList;
