import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { gameSocket } from '../../services/socket/gameSocket';
import { useGameState } from '../../hooks/useGameState';
import { useAuth } from '../../hooks/useAuth';
import { useGameRoomSetup } from '../../hooks/useGameRoomSetup';
import { useGameRoomLobby } from '../../hooks/useGameRoomLobby';
import { useGameRoomPlaying } from '../../hooks/useGameRoomPlaying';
import { useGameRoomEnd } from '../../hooks/useGameRoomEnd';
import { setRoom } from '../../store/gameSlice';
import { updateRoom, clearCurrentRoom } from '../../store/roomSlice';
import { clearGame } from '../../store/gameSlice';
import GameBoard from '../../components/GameBoard/GameBoard';
import GameSidebar from '../../components/GameSidebar/GameSidebar';
import GameRoomHeader from '../../components/GameRoom/GameRoomHeader';
import GameRoomControls from '../../components/GameRoom/GameRoomControls';
import GameRoomModals from '../../components/GameRoom/GameRoomModals';
import { ROOM_STATUS } from '../../utils/constants';

const GameRoom = () => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { currentRoom } = useSelector((state) => state.room);
  const { board, isGameOver, currentPlayerIndex, players, history } = useGameState();
  const gameBoardRef = useRef(null);
  const sidebarRef = useRef(null);
  const [boardHeight, setBoardHeight] = useState(null);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  
  useEffect(() => {
    if (!roomId) {
      navigate('/lobby');
    }
  }, [roomId, navigate]);

  const {
    roomInfo,
    hasJoined,
    isJoining,
    showPasswordModal,
    playerMarks,
    turnTimeLimit,
    firstTurn,
    setPlayerMarks,
    setTurnTimeLimit,
    setFirstTurn,
    handlePasswordSubmit,
    handlePasswordCancel,
  } = useGameRoomSetup(roomId);

  const handlePlayerKickedRef = useRef(null);
  const {
    handleReady,
    handleStartGame,
    handleSaveRoomSettings,
    setupLobbyListeners,
  } = useGameRoomLobby(roomId, currentRoom, (data) => {
    if (handlePlayerKickedRef.current) {
      handlePlayerKickedRef.current(data);
    }
  });

  const {
    gameStartTime,
    pingTimeoutRemaining,
    turnTimeRemaining,
    showDrawModal,
    showSurrenderModal,
    drawRequestInfo,
    handleCellClick,
    handleRequestDraw,
    handleDrawAccept,
    handleDrawReject,
    handleDrawCancel,
    handleSurrender,
    handleConfirmSurrender,
    handleCancelSurrender,
    formatGameDuration,
    setupPlayingListeners,
    stopPingInterval,
    stopTurnTimer,
    gameStateReceived,
    setGameStateReceived,
  } = useGameRoomPlaying(roomId, hasJoined, currentRoom, setPlayerMarks, setTurnTimeLimit, setFirstTurn);

  // Tự động fetch game state khi quay lại phòng đang chơi
  useEffect(() => {
    if (!roomId || !hasJoined || !currentRoom) return;

    const isPlaying = currentRoom.status === ROOM_STATUS.PLAYING;
    
    if (isPlaying && !gameStateReceived) {
      setGameStateReceived(false);
      const timeoutId = setTimeout(() => {
        gameSocket.getGameState(roomId);
      }, 500);
      return () => clearTimeout(timeoutId);
    } else if (!isPlaying) {
      setGameStateReceived(true);
    }
  }, [roomId, hasJoined, currentRoom?.status, gameStateReceived, setGameStateReceived]);

  const handlePlayerKicked = useCallback((data) => {
    stopPingInterval();
    stopTurnTimer();
    dispatch(clearCurrentRoom());
    dispatch(clearGame());
    navigate('/lobby', { state: { fromGameRoom: true, kicked: true } });
  }, [navigate, dispatch, stopPingInterval, stopTurnTimer]);

  useEffect(() => {
    handlePlayerKickedRef.current = handlePlayerKicked;
  }, [handlePlayerKicked]);

  const {
    gameResult,
    gameResultMessage,
    handleGameEnd,
    resetGameEndFlags,
    setupGameEndListener,
  } = useGameRoomEnd(stopPingInterval, stopTurnTimer);

  const [showRoomSettingsModal, setShowRoomSettingsModal] = useState(false);
  const [showLeaveRoomModal, setShowLeaveRoomModal] = useState(false);

  useEffect(() => {
    const cleanup = setupLobbyListeners();
    return cleanup;
  }, [setupLobbyListeners]);

  useEffect(() => {
    const onGameStart = (data) => {
      resetGameEndFlags();
    };

    const cleanupPlaying = setupPlayingListeners(
      onGameStart,
      handleGameEnd
    );
    const cleanupEnd = setupGameEndListener();

    return () => {
      cleanupPlaying();
      cleanupEnd();
    };
  }, [setupPlayingListeners, setupGameEndListener, handleGameEnd, resetGameEndFlags, setPlayerMarks, setTurnTimeLimit, setFirstTurn]);

  const handleLeaveRoom = useCallback(() => {
    setShowLeaveRoomModal(true);
  }, []);

  const handleConfirmLeaveRoom = useCallback(() => {
    stopPingInterval();
    gameSocket.leaveRoom(roomId);
    dispatch(clearCurrentRoom());
    dispatch(clearGame());
    navigate('/lobby', { state: { fromGameRoom: true } });
  }, [roomId, navigate, dispatch, stopPingInterval]);

  const handleCancelLeaveRoom = useCallback(() => {
    setShowLeaveRoomModal(false);
  }, []);

  const userId = user?.id || user?._id;
  const hostIdMatch = currentRoom?.hostId?.toString() === userId?.toString();
  const player = currentRoom?.players?.find(p => 
    p.userId?.toString() === userId?.toString() || p.userId === userId
  );
  const isHost = hostIdMatch || player?.isHost || false;
  const isPlaying = currentRoom?.status === ROOM_STATUS.PLAYING;
  const currentPlayer = players?.[currentPlayerIndex];
  const isMyTurn = currentPlayer?.userId?.toString() === userId?.toString();

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const updateBoardHeight = () => {
      if (gameBoardRef.current && isDesktop) {
        const gameBoardElement = gameBoardRef.current.querySelector('.max-w-2xl');
        if (gameBoardElement) {
          const rect = gameBoardElement.getBoundingClientRect();
          const height = rect.height;
          if (height > 0 && Math.abs(height - (boardHeight || 0)) > 1) {
            setBoardHeight(height);
          }
        } else {
          const height = gameBoardRef.current.offsetHeight;
          if (height > 0 && Math.abs(height - (boardHeight || 0)) > 1) {
            setBoardHeight(height);
          }
        }
      } else {
        setBoardHeight(null);
      }
    };

    const timeoutId1 = setTimeout(updateBoardHeight, 100);
    const timeoutId2 = setTimeout(updateBoardHeight, 500);
    
    const resizeObserver = new ResizeObserver(() => {
      updateBoardHeight();
    });
    
    if (gameBoardRef.current) {
      resizeObserver.observe(gameBoardRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
    };
  }, [board, isGameOver, isDesktop, boardHeight]);

  if (isJoining && !currentRoom && !roomInfo && !showPasswordModal) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-lg">Đang tải thông tin phòng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-50 to-blue-100 p-4">
      <div className="max-w-7xl mx-auto">
        <GameRoomModals
          showPasswordModal={showPasswordModal}
          roomId={roomId}
          roomInfo={roomInfo}
          handlePasswordSubmit={handlePasswordSubmit}
          handlePasswordCancel={handlePasswordCancel}
          showDrawModal={showDrawModal}
          drawRequestInfo={drawRequestInfo}
          user={user}
          handleDrawAccept={handleDrawAccept}
          handleDrawReject={handleDrawReject}
          handleDrawCancel={handleDrawCancel}
          showSurrenderModal={showSurrenderModal}
          handleCancelSurrender={handleCancelSurrender}
          handleConfirmSurrender={handleConfirmSurrender}
          showRoomSettingsModal={showRoomSettingsModal}
          setShowRoomSettingsModal={setShowRoomSettingsModal}
          handleSaveRoomSettings={handleSaveRoomSettings}
          currentRoom={currentRoom}
          playerMarks={playerMarks}
          turnTimeLimit={turnTimeLimit}
          firstTurn={firstTurn}
          showLeaveRoomModal={showLeaveRoomModal}
          handleCancelLeaveRoom={handleCancelLeaveRoom}
          handleConfirmLeaveRoom={handleConfirmLeaveRoom}
          isPlaying={isPlaying}
        />

        <div className="bg-white rounded-lg shadow p-3 sm:p-4 mb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <GameRoomHeader
                currentRoom={currentRoom}
                roomInfo={roomInfo}
                turnTimeLimit={turnTimeLimit}
                gameResult={gameResult}
                gameResultMessage={gameResultMessage}
                isPlaying={isPlaying}
                gameStartTime={gameStartTime}
                formatGameDuration={formatGameDuration}
                turnTimeRemaining={turnTimeRemaining}
              />
            </div>
            <GameRoomControls
              isPlaying={isPlaying}
              isGameOver={isGameOver}
              isHost={isHost}
              player={player}
              currentRoom={currentRoom}
              userId={userId}
              roomId={roomId}
              handleReady={handleReady}
              handleStartGame={handleStartGame}
              handleRequestDraw={handleRequestDraw}
              handleSurrender={handleSurrender}
              handleLeaveRoom={handleLeaveRoom}
              setShowRoomSettingsModal={setShowRoomSettingsModal}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4" style={{ minHeight: 0 }}>
          <div 
            className="md:col-span-2 order-1" 
            style={{ 
              minHeight: 0, 
              display: 'flex', 
              flexDirection: 'column',
              ...(boardHeight && isDesktop ? { height: `${boardHeight}px`, maxHeight: `${boardHeight}px` } : {})
            }}
          >
            <div 
              ref={gameBoardRef}
              className="flex-1 min-h-0 flex items-center justify-center"
              style={{
                ...(boardHeight && isDesktop ? { height: '100%', maxHeight: '100%', overflow: 'visible' } : {})
              }}
            >
              <GameBoard 
                onCellClick={handleCellClick} 
                disabled={!isPlaying || !isMyTurn || isGameOver || !gameStateReceived} 
              />
            </div>
          </div>

          <div
            ref={sidebarRef}
            className="order-4 md:order-2 md:col-span-1"
            style={{
              ...(boardHeight && isDesktop ? { height: `${boardHeight}px`, maxHeight: `${boardHeight}px` } : {})
            }}
          >
            <GameSidebar 
              roomId={roomId} 
              playerMarks={playerMarks} 
              history={history}
              currentRoom={currentRoom}
              isHost={isHost}
              isPlaying={isPlaying}
            />
          </div>
        </div>



      </div>
    </div>
  );
};

export default GameRoom;
