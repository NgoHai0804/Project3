import React from 'react';

const GameRoomHeader = ({ 
  currentRoom, 
  roomInfo, 
  turnTimeLimit, 
  gameResult, 
  gameResultMessage,
  isPlaying,
  gameStartTime,
  formatGameDuration,
  turnTimeRemaining
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 truncate">
                {currentRoom?.name || roomInfo?.name || 'Phòng chơi'}
              </h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs sm:text-sm text-gray-600">
                {currentRoom?.hasPassword && (
                  <span className="flex items-center gap-1 whitespace-nowrap">
                     Có mật khẩu
                  </span>
                )}
                <span className="flex items-center gap-1 whitespace-nowrap">
                   Thời gian mỗi lượt: {turnTimeLimit}s
                </span>
              </div>
            </div>
            {gameResult ? (
              // Hiển thị kết quả game
              <div className={`flex items-center justify-center px-3 py-2 sm:px-4 rounded-lg border-2 ${
                gameResult === 'win' 
                  ? 'bg-green-100 border-green-400' 
                  : gameResult === 'lose' 
                    ? 'bg-red-100 border-red-400' 
                    : 'bg-yellow-100 border-yellow-400'
              }`}>
                <span className={`text-base sm:text-xl font-bold ${
                  gameResult === 'win' 
                    ? 'text-green-600' 
                    : gameResult === 'lose' 
                      ? 'text-red-600' 
                      : 'text-yellow-600'
                }`}>
                  {gameResultMessage || (gameResult === 'win' ? 'Bạn thắng!' : gameResult === 'lose' ? 'Bạn thua!' : 'Hòa!')}
                </span>
              </div>
            ) : isPlaying && gameStartTime && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 sm:gap-6">
                {/* Thời gian đã chơi */}
                <div className="flex items-center gap-1 sm:gap-2 bg-blue-50 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 border-blue-200">
                  <span className="text-xs sm:text-sm font-medium text-blue-700">Thời gian:</span>
                  <span className="text-base sm:text-xl font-bold text-blue-600">{formatGameDuration()}</span>
                </div>
                {/* Thời gian còn lại */}
                {turnTimeRemaining !== null && (
                  <div className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg border-2 ${
                    turnTimeRemaining <= 10 
                      ? 'bg-red-100 border-red-400 animate-blink-warning' 
                      : turnTimeRemaining > turnTimeLimit * 0.5 
                        ? 'bg-green-50 border-green-200' 
                        : turnTimeRemaining > turnTimeLimit * 0.25 
                          ? 'bg-yellow-50 border-yellow-200' 
                          : 'bg-orange-50 border-orange-200'
                  }`}>
                    <span className={`text-xs sm:text-sm font-medium ${
                      turnTimeRemaining <= 10 
                        ? 'text-red-700' 
                        : turnTimeRemaining > turnTimeLimit * 0.5 
                          ? 'text-green-700' 
                          : turnTimeRemaining > turnTimeLimit * 0.25 
                            ? 'text-yellow-700' 
                            : 'text-orange-700'
                    }`}>
                      ⏳ Lượt đi:
                    </span>
                    <span className={`text-lg sm:text-2xl font-bold ${
                      turnTimeRemaining <= 10 
                        ? 'text-red-600 animate-blink-warning' 
                        : turnTimeRemaining > turnTimeLimit * 0.5 
                          ? 'text-green-600' 
                          : turnTimeRemaining > turnTimeLimit * 0.25 
                            ? 'text-yellow-600' 
                            : 'text-orange-600'
                    }`}>
                      {Math.max(0, turnTimeRemaining)}s
                    </span>
                  </div>
                )}
              </div>
            )}
    </div>
  );
};

export default GameRoomHeader;
