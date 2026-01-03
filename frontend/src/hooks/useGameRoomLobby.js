// useGameRoomLobby

import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { gameSocket } from '../services/socket/gameSocket';
import { updateRoom } from '../store/roomSlice';
import { setRoom } from '../store/gameSlice';
import { useAuth } from './useAuth';

export const useGameRoomLobby = (roomId, currentRoom, onPlayerKicked) => {
  const dispatch = useDispatch();
  const { user } = useAuth();

  // Xử lý ready/unready
  const handleReady = useCallback(() => {
    const userId = user?.id || user?._id;
    const player = currentRoom?.players?.find(p => 
      p.userId?.toString() === userId?.toString() || p.userId === userId
    );
    
    if (!player) {
      toast.error('Bạn chưa tham gia phòng. Vui lòng thử lại.');
      console.error('Không tìm thấy người chơi trong phòng:', { 
        userId, 
        roomId, 
        players: currentRoom?.players,
        currentRoom: currentRoom?._id,
      });
      if (!currentRoom) {
        gameSocket.joinRoom(roomId, '');
      }
      return;
    }
    
    if (player?.isReady) {
      gameSocket.playerReady(roomId, false);
    } else {
      gameSocket.playerReady(roomId, true);
    }
  }, [user, currentRoom, roomId]);

  // Xử lý bắt đầu game
  const handleStartGame = useCallback(() => {
    const userId = user?.id || user?._id;
    const hostId = currentRoom?.hostId?.toString();
    const userStr = userId?.toString();
    
    if (hostId !== userStr) {
      toast.error('Chỉ chủ phòng mới có thể bắt đầu game');
      return;
    }
    gameSocket.startGame(roomId);
  }, [user, currentRoom, roomId]);

  // Xử lý cập nhật cài đặt phòng
  const handleSaveRoomSettings = useCallback((settings) => {
    gameSocket.updateRoomSettings(roomId, settings);
  }, [roomId]);

  // Socket event handlers cho lobby
  const setupLobbyListeners = useCallback(() => {
    const handlePlayerReadyStatus = (data) => {
      dispatch(updateRoom(data.room));
      dispatch(setRoom({ roomId, players: data.room.players }));
      
      if (data.message) {
        toast.info(data.message, {
          position: "top-right",
          autoClose: 1000,
        });
      }
    };

    const handleReadyError = (data) => {
      console.error('Lỗi ready:', data);
      toast.error(data.message || 'Không thể thay đổi trạng thái sẵn sàng');
    };

    const handleStartError = (data) => {
      console.error('Lỗi khi bắt đầu game:', data);
      const errorMessage = data.message || data.error || 'Không thể bắt đầu game';
      toast.error(errorMessage);
      if (data.error) {
      }
    };

    const handleRoomSettingsUpdated = (data) => {
      console.log('Cài đặt phòng đã được cập nhật:', data);
      dispatch(updateRoom(data.room));
      toast.success(data.message || 'Cài đặt phòng đã được cập nhật!', {
        position: "top-right",
        autoClose: 1000,
      });
    };

    const handleRoomSettingsError = (data) => {
      console.error('Lỗi cài đặt phòng:', data);
      toast.error(data.message || 'Không thể cập nhật cài đặt phòng');
    };

    const handleKickSuccess = (data) => {
      toast.success(data.message || 'Đã đuổi người chơi ra khỏi phòng', {
        position: "top-right",
        autoClose: 1000,
      });
    };

    const handleKickError = (data) => {
      console.error('Lỗi khi đuổi người chơi:', data);
      toast.error(data.message || 'Không thể đuổi người chơi');
    };

    const handlePlayerKicked = (data) => {
      toast.error(data.message || 'Bạn đã bị đuổi khỏi phòng bởi chủ phòng', {
        position: "top-right",
        autoClose: 1000,
      });
      if (onPlayerKicked) {
        onPlayerKicked(data);
      }
    };

    gameSocket.onPlayerReadyStatus(handlePlayerReadyStatus);
    gameSocket.onReadyError(handleReadyError);
    gameSocket.onStartError(handleStartError);
    gameSocket.onRoomSettingsUpdated(handleRoomSettingsUpdated);
    gameSocket.onRoomSettingsError(handleRoomSettingsError);
    gameSocket.onKickSuccess(handleKickSuccess);
    gameSocket.onKickError(handleKickError);
    gameSocket.onPlayerKicked(handlePlayerKicked);

    return () => {
      gameSocket.offPlayerReadyStatus(handlePlayerReadyStatus);
      gameSocket.offReadyError(handleReadyError);
      gameSocket.offStartError(handleStartError);
      gameSocket.offRoomSettingsUpdated(handleRoomSettingsUpdated);
      gameSocket.offRoomSettingsError(handleRoomSettingsError);
      gameSocket.offKickSuccess(handleKickSuccess);
      gameSocket.offKickError(handleKickError);
      gameSocket.offPlayerKicked(handlePlayerKicked);
    };
  }, [roomId, dispatch, onPlayerKicked]);

  return {
    handleReady,
    handleStartGame,
    handleSaveRoomSettings,
    setupLobbyListeners,
  };
};

export default useGameRoomLobby;

