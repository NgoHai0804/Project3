import React from 'react';
import { toast } from 'react-toastify';
import { gameSocket } from '../../services/socket/gameSocket';

const GameRoomControls = ({
  isPlaying,
  isGameOver,
  isHost,
  player,
  currentRoom,
  userId,
  roomId,
  handleReady,
  handleStartGame,
  handleRequestDraw,
  handleSurrender,
  handleLeaveRoom,
  setShowRoomSettingsModal
}) => {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Game Control Buttons */}
      {!isPlaying && (
        <>
          {(() => {
            if (!currentRoom || !currentRoom.players || currentRoom.players.length === 0) {
              return (
                <button
                  onClick={() => {
                    toast.info('Đang kết nối lại với phòng...');
                    gameSocket.joinRoom(roomId, '');
                  }}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm sm:text-base"
                >
                  Kết nối lại
                </button>
              );
            }

            if (!player) {
              if (currentRoom?.players?.length > 0) {
                console.warn('Không tìm thấy người chơi trong phòng cho nút ready:', { userId, roomId, players: currentRoom?.players });
              }
              return (
                <button
                  onClick={() => {
                    toast.info('Đang kết nối lại với phòng...');
                    gameSocket.joinRoom(roomId, '');
                  }}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm sm:text-base"
                >
                  Kết nối lại
                </button>
              );
            }
            
            if (isHost) {
              const roomPlayers = currentRoom?.players || [];
              const nonHostPlayers = roomPlayers.filter(p => !p.isHost && !p.isDisconnected) || [];
              const allNonHostReady = nonHostPlayers.length > 0 && nonHostPlayers.every(p => p.isReady);
              const canStart = roomPlayers.length >= 2 && allNonHostReady;
              
              return (
                <>
                  <button
                    onClick={() => setShowRoomSettingsModal(true)}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base"
                  >
                    Chỉnh sửa
                  </button>
                  <button
                    onClick={handleStartGame}
                    disabled={!canStart}
                    className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                    title={!canStart ? (currentRoom?.players?.length < 2 ? 'Cần ít nhất 2 người chơi' : 'Tất cả người chơi (trừ chủ phòng) phải sẵn sàng') : 'Bắt đầu game'}
                  >
                    Bắt đầu game
                  </button>
                </>
              );
            }
            
            return (
              <button
                onClick={handleReady}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors text-sm sm:text-base ${
                  player.isReady
                    ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {player.isReady ? 'Hủy sẵn sàng' : 'Sẵn sàng'}
              </button>
            );
          })()}
        </>
      )}
      {isPlaying && !isGameOver && (
        <>
          <button
            onClick={handleRequestDraw}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm sm:text-base"
          >
            Xin hòa
          </button>
          <button
            onClick={handleSurrender}
            className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base"
          >
            Đầu hàng
          </button>
        </>
      )}
      <button
        onClick={handleLeaveRoom}
        className="px-3 py-1.5 sm:px-4 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base"
      >
        Rời phòng
      </button>
    </div>
  );
};

export default GameRoomControls;
