// Hook xử lý việc setup và join vào phòng

import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { gameSocket } from '../services/socket/gameSocket';
import { socketClient } from '../services/socket/socketClient';
import { setCurrentRoom, updateRoom, clearCurrentRoom } from '../store/roomSlice';
import { setRoom, clearGame } from '../store/gameSlice';
import { updateProfile } from '../store/userSlice';
import { roomApi } from '../services/api/roomApi';
import { ROOM_STATUS, SOCKET_EVENTS } from '../utils/constants';
import { useAuth } from './useAuth';

export const useGameRoomSetup = (roomId) => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { currentRoom } = useSelector((state) => state.room);
  
  const [roomInfo, setRoomInfo] = useState(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [hasCheckedReconnect, setHasCheckedReconnect] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [playerMarks, setPlayerMarks] = useState({});
  const [turnTimeLimit, setTurnTimeLimit] = useState(30);
  const [firstTurn, setFirstTurn] = useState('X');
  const getGameStateRequestedRef = useRef(false);

  // Cập nhật ELO từ room players
  const updateUserEloFromRoom = useCallback((room) => {
    if (!room?.players || !user) return;
    
    const userId = user?.id || user?._id;
    const currentPlayer = room.players.find(p => 
      p.userId?.toString() === userId?.toString() || 
      p.userId?._id?.toString() === userId?.toString()
    );
    
    if (currentPlayer && (currentPlayer.elo || currentPlayer.score)) {
      const newElo = currentPlayer.elo || currentPlayer.score;
      if (user.gameStats) {
        const caroStats = user.gameStats.find(s => s.gameId === 'caro') || user.gameStats[0];
        if (!caroStats || caroStats.score !== newElo) {
          const updatedGameStats = user.gameStats.map(stat => 
            stat.gameId === 'caro' || (!caroStats && stat === user.gameStats[0])
              ? { ...stat, score: newElo }
              : stat
          );
          if (!updatedGameStats.find(s => s.gameId === 'caro')) {
            updatedGameStats.push({ gameId: 'caro', score: newElo });
          }
          dispatch(updateProfile({ gameStats: updatedGameStats }));
        }
      } else {
        dispatch(updateProfile({ 
          gameStats: [{ gameId: 'caro', score: newElo }] 
        }));
      }
    }
  }, [user, dispatch]);

  // Tự động set hasJoined nếu đã có currentRoom
  useEffect(() => {
    if (currentRoom && currentRoom._id?.toString() === roomId && !hasJoined) {
      setHasJoined(true);
      if (!roomInfo) {
        setRoomInfo(currentRoom);
      }
    }
  }, [currentRoom, roomId, hasJoined, roomInfo]);

  // Kiểm tra phòng và xử lý password
  useEffect(() => {
    if (hasJoined || isJoining) return;

    if (currentRoom && currentRoom._id?.toString() === roomId) {
      setRoomInfo(currentRoom);
      setHasJoined(true);
      setIsJoining(false);
      return;
    }

    const checkRoomAndJoin = async () => {
      if (!roomId) {
        console.error('Không có roomId trong checkRoomAndJoin, đang chuyển hướng đến lobby');
        toast.error('Không tìm thấy thông tin phòng');
        navigate('/lobby');
        return;
      }

      setIsJoining(true);

      try {
        const socket = socketClient.getSocket();
        if (!socket || !socket.connected) {
          console.log('Socket chưa kết nối, đang đợi kết nối...');
          let retryCount = 0;
          const maxRetries = 10;
          const waitForSocket = () => {
            return new Promise((resolve, reject) => {
              const checkSocket = () => {
                const currentSocket = socketClient.getSocket();
                if (currentSocket && currentSocket.connected) {
                  resolve();
                } else if (retryCount >= maxRetries) {
                  reject(new Error('Socket không thể kết nối'));
                } else {
                  retryCount++;
                  setTimeout(checkSocket, 500);
                }
              };
              checkSocket();
            });
          };
          
          try {
            await waitForSocket();
            console.log('Socket đã kết nối, tiếp tục join room');
          } catch (error) {
            console.error('Lỗi khi đợi socket kết nối:', error);
            toast.error('Không thể kết nối với server');
            navigate('/lobby');
            setIsJoining(false);
            return;
          }
        }

        const userRoomCheck = await roomApi.checkUserRoom();
        const isUserInThisRoom = userRoomCheck?.inRoom && userRoomCheck?.room?._id?.toString() === roomId;

        if (isUserInThisRoom) {
          setRoomInfo(userRoomCheck.room);
          gameSocket.joinRoom(roomId, '');
          setIsJoining(false);
          return;
        }

        const rooms = await roomApi.getRooms();
        const room = Array.isArray(rooms) 
          ? rooms.find(r => (r._id === roomId) || (r._id?.toString() === roomId))
          : null;

        if (!room) {
          toast.error('Không tìm thấy phòng');
          navigate('/lobby');
          setIsJoining(false);
          return;
        }

        setRoomInfo(room);

        const userId = user?.id || user?._id;
        const isHost = room.hostId && room.hostId.toString() === userId?.toString();

        if (isHost) {
          gameSocket.joinRoom(roomId, '');
          setIsJoining(false);
          return;
        }

        const savedPassword = sessionStorage.getItem(`room_password_${roomId}`);
        const passwordFromState = location?.state?.password;
        const passwordToUse = savedPassword || passwordFromState;
        
        if (room.passwordHash) {
          if (passwordToUse) {
            try {
              await roomApi.verifyPassword(roomId, passwordToUse);
              sessionStorage.removeItem(`room_password_${roomId}`);
              gameSocket.joinRoom(roomId, passwordToUse);
            } catch (error) {
              console.error('Xác thực mật khẩu thất bại:', error);
              sessionStorage.removeItem(`room_password_${roomId}`);
              setShowPasswordModal(true);
              setIsJoining(false);
            }
          } else {
            setShowPasswordModal(true);
            setIsJoining(false);
          }
        } else {
          gameSocket.joinRoom(roomId, '');
        }
      } catch (error) {
        console.error('Lỗi khi kiểm tra phòng:', error);
        toast.error('Không thể tải thông tin phòng');
        navigate('/lobby');
        setIsJoining(false);
      }
    };

    checkRoomAndJoin();
  }, [roomId]);

  // Xử lý password modal submit
  const handlePasswordSubmit = async (password) => {
    
    if (isJoining || hasJoined) {
      throw new Error('Đang xử lý, vui lòng đợi...');
    }
    
    if (!roomId) {
      console.error('Không có roomId trong handlePasswordSubmit');
      const error = new Error('Không có thông tin phòng');
      setShowPasswordModal(false);
      navigate('/lobby');
      throw error;
    }

    if (!password && password !== '') {
      console.error('Không có mật khẩu trong handlePasswordSubmit');
      throw new Error('Vui lòng nhập mật khẩu');
    }

    if (!roomInfo) {
      console.warn('Không có thông tin phòng, có thể phòng đã bị xóa');
    }

    setIsJoining(true);
    
    try {
      await roomApi.verifyPassword(roomId, password || '');
      setShowPasswordModal(false);
      gameSocket.joinRoom(roomId, password || '');
    } catch (error) {
      setIsJoining(false);
      console.error('Xác thực mật khẩu thất bại:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Mật khẩu không đúng';
      throw new Error(errorMessage);
    }
  };

  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
    navigate('/lobby');
  };

  // Xử lý socket events
  useEffect(() => {
    const handleReconnectCheck = (data) => {
      if (data.inRoom && data.room) {
        if (!hasJoined || currentRoom?._id !== data.room._id) {
          dispatch(setCurrentRoom(data.room));
          dispatch(setRoom({ roomId: data.room._id, players: data.room.players || [] }));
          updateUserEloFromRoom(data.room);
          
          if (data.room.playerMarks) {
            const playerMarksObj = data.room.playerMarks instanceof Map 
              ? Object.fromEntries(data.room.playerMarks) 
              : data.room.playerMarks;
            setPlayerMarks(playerMarksObj);
          }
          if (data.room.firstTurn) {
            setFirstTurn(data.room.firstTurn);
          }
          if (data.room.turnTimeLimit) {
            setTurnTimeLimit(data.room.turnTimeLimit);
          }
          
          if (data.gameState && data.room.status === ROOM_STATUS.PLAYING) {
            dispatch(setRoom({
              roomId: data.room._id,
              players: data.room.players || [],
            }));
          } else if (data.room.status === ROOM_STATUS.PLAYING && !data.gameState && !getGameStateRequestedRef.current) {
            getGameStateRequestedRef.current = true;
            setTimeout(() => {
              gameSocket.getGameState(data.room._id);
              setTimeout(() => {
                getGameStateRequestedRef.current = false;
              }, 2000);
            }, 500);
          }
          
          setHasJoined(true);
          setIsJoining(false);
        }
      }
    };

    const handleReconnectSuccess = (data) => {
      const room = data.room || data;
      if (!hasJoined || currentRoom?._id !== room._id) {
        dispatch(setCurrentRoom(room));
        dispatch(setRoom({ roomId: room._id, players: room.players || [] }));
        updateUserEloFromRoom(room);
        
        if (room.playerMarks) {
          const playerMarksObj = room.playerMarks instanceof Map 
            ? Object.fromEntries(room.playerMarks) 
            : room.playerMarks;
          setPlayerMarks(playerMarksObj);
        }
        if (room.firstTurn) {
          setFirstTurn(room.firstTurn);
        }
        if (room.turnTimeLimit) {
          setTurnTimeLimit(room.turnTimeLimit);
        }
        
        if (data.gameState && room.status === ROOM_STATUS.PLAYING) {
          dispatch(setRoom({
            roomId: room._id,
            players: room.players || [],
          }));
        } else if (room.status === ROOM_STATUS.PLAYING && !data.gameState && !getGameStateRequestedRef.current) {
          getGameStateRequestedRef.current = true;
          setTimeout(() => {
            gameSocket.getGameState(room._id);
            setTimeout(() => {
              getGameStateRequestedRef.current = false;
            }, 2000);
          }, 500);
        }
        
        setHasJoined(true);
        setIsJoining(false);
      }
    };

    const handleJoinSuccess = (data) => {
      const room = data.room || data;
      dispatch(setCurrentRoom(room));
      dispatch(setRoom({ roomId, players: room.players || [] }));
      updateUserEloFromRoom(room);
      
      if (room.playerMarks) {
        const playerMarksObj = room.playerMarks instanceof Map 
          ? Object.fromEntries(room.playerMarks) 
          : room.playerMarks;
        setPlayerMarks(playerMarksObj);
      }
      if (room.firstTurn) {
        setFirstTurn(room.firstTurn);
      }
      if (room.turnTimeLimit) {
        setTurnTimeLimit(room.turnTimeLimit);
      }
      
      if (room.status === ROOM_STATUS.PLAYING && !getGameStateRequestedRef.current) {
        getGameStateRequestedRef.current = true;
        setTimeout(() => {
          gameSocket.getGameState(roomId);
          setTimeout(() => {
            getGameStateRequestedRef.current = false;
          }, 2000);
        }, 300);
      }
      
      setShowPasswordModal(false);
      setHasJoined(true);
      setIsJoining(false);
    };

    const handleJoinError = (data) => {
      const errorMessage = data.message || 'Không thể tham gia phòng';
      setIsJoining(false);
      toast.error(errorMessage);
      
      if (errorMessage.includes('mật khẩu') || errorMessage.includes('password') || errorMessage.includes('Sai')) {
        setShowPasswordModal(true);
        setHasJoined(false);
        sessionStorage.removeItem(`room_password_${roomId}`);
      } else {
        navigate('/lobby');
      }
    };

    const handleRoomUpdate = (data) => {
      dispatch(updateRoom(data.room));
      dispatch(setRoom({ roomId, players: data.room.players }));
      updateUserEloFromRoom(data.room);
      
      if (data.room.playerMarks) {
        const playerMarksObj = data.room.playerMarks instanceof Map 
          ? Object.fromEntries(data.room.playerMarks) 
          : data.room.playerMarks;
        setPlayerMarks(playerMarksObj);
      }
      if (data.room.firstTurn) {
        setFirstTurn(data.room.firstTurn);
      }
      if (data.room.turnTimeLimit) {
        setTurnTimeLimit(data.room.turnTimeLimit);
      }
    };

    const handlePlayerJoined = (data) => {
      dispatch(updateRoom(data.room));
      dispatch(setRoom({ roomId, players: data.room.players }));
      const playerName = data.nickname || data.username || 'Người chơi';
      toast.info(data.message || `${playerName} đã tham gia phòng`, {
        position: "top-right",
        autoClose: 1000,
      });
    };

    const handlePlayerLeft = (data) => {
      dispatch(updateRoom(data.room));
      dispatch(setRoom({ roomId, players: data.room.players }));
      const playerName = data.nickname || data.username || 'Người chơi';
      toast.warning(data.message || `${playerName} đã rời phòng`, {
        position: "top-right",
        autoClose: 1000,
      });
    };

    const handlePlayerDisconnected = (data) => {
      dispatch(updateRoom(data.room));
      dispatch(setRoom({ roomId, players: data.room.players }));
    };

    const handlePlayerReconnected = (data) => {
      dispatch(updateRoom(data.room));
      dispatch(setRoom({ roomId, players: data.room.players }));
    };

    const handleRoomDeleted = (data) => {
      toast.warning(data.message || 'Phòng đã bị xóa');
      navigate('/lobby');
    };

    // Đăng ký listeners
    gameSocket.onJoinSuccess(handleJoinSuccess);
    gameSocket.onJoinError(handleJoinError);
    gameSocket.onRoomUpdate(handleRoomUpdate);
    gameSocket.onPlayerJoined(handlePlayerJoined);
    gameSocket.onPlayerLeft(handlePlayerLeft);
    gameSocket.onPlayerDisconnected(handlePlayerDisconnected);
    gameSocket.onPlayerReconnected(handlePlayerReconnected);
    gameSocket.onReconnectCheck(handleReconnectCheck);
    gameSocket.onReconnectSuccess(handleReconnectSuccess);
    gameSocket.onRoomDeleted(handleRoomDeleted);

    const socket = socketClient.getSocket();
    if (socket && socket.connected && !hasCheckedReconnect && !hasJoined && !isJoining) {
      setHasCheckedReconnect(true);
      setTimeout(() => {
        if (!hasJoined && !isJoining) {
          gameSocket.checkReconnect();
        }
      }, 500);
    }

    const reconnectCallback = () => {
      setTimeout(() => {
        gameSocket.checkReconnect();
        if (hasJoined && currentRoom?.status === ROOM_STATUS.PLAYING && !getGameStateRequestedRef.current) {
          getGameStateRequestedRef.current = true;
          gameSocket.getGameState(roomId);
          setTimeout(() => {
            getGameStateRequestedRef.current = false;
          }, 2000);
        }
      }, 500);
    };
    
    socketClient.onReconnect(reconnectCallback);

    return () => {
      try {
        gameSocket.offJoinSuccess(handleJoinSuccess);
        gameSocket.offJoinError(handleJoinError);
        gameSocket.offRoomUpdate(handleRoomUpdate);
        gameSocket.offPlayerJoined(handlePlayerJoined);
        gameSocket.offPlayerLeft(handlePlayerLeft);
        gameSocket.offPlayerDisconnected(handlePlayerDisconnected);
        gameSocket.offPlayerReconnected(handlePlayerReconnected);
        gameSocket.offReconnectCheck(handleReconnectCheck);
        gameSocket.offReconnectSuccess(handleReconnectSuccess);
        gameSocket.offRoomDeleted(handleRoomDeleted);
      } catch (error) {
        console.error('Lỗi khi dọn dẹp socket listeners:', error);
      }
    };
  }, [roomId, hasJoined, isJoining, hasCheckedReconnect, currentRoom, dispatch, navigate, updateUserEloFromRoom]);

  return {
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
  };
};

export default useGameRoomSetup;

