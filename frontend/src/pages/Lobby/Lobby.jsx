import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { roomApi } from '../../services/api/roomApi';
import { setRooms, addRoom, removeRoom, updateRoom } from '../../store/roomSlice';
import { gameSocket } from '../../services/socket/gameSocket';
import LobbyHeader from './components/LobbyHeader';
import SearchAndFilter from './components/SearchAndFilter';
import RoomList from './components/RoomList';

const Lobby = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { rooms } = useSelector((state) => state.room);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  
  const refreshIntervalRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const isUserActiveRef = useRef(true);
  const previousPathnameRef = useRef(null);
  const refreshFromEventRef = useRef(false);
  const isMountedRef = useRef(false);

  const loadRooms = useCallback(async (delayCheckUserRoom = 0) => {
    try {
      setLoading(true);
      
      const roomsPromise = roomApi.getRooms().catch(err => {
        console.error('Lỗi khi tải danh sách phòng:', err);
        return null;
      });
      
      const userRoomCheckPromise = delayCheckUserRoom > 0
        ? new Promise(resolve => {
            setTimeout(async () => {
              try {
                const result = await roomApi.checkUserRoom();
                resolve(result);
              } catch (err) {
                console.error('Lỗi khi kiểm tra phòng của user:', err);
                resolve(null);
              }
            }, delayCheckUserRoom);
          })
        : roomApi.checkUserRoom().catch(err => {
            console.error('Lỗi khi kiểm tra phòng của user:', err);
            return null;
          });
      
      const [roomsResponse, userRoomCheck] = await Promise.all([
        roomsPromise,
        userRoomCheckPromise
      ]);
      
      let rooms = [];
      if (roomsResponse) {
        if (Array.isArray(roomsResponse)) {
          rooms = roomsResponse;
        } else if (roomsResponse?.data && Array.isArray(roomsResponse.data)) {
          rooms = roomsResponse.data;
        } else if (roomsResponse?.rooms && Array.isArray(roomsResponse.rooms)) {
          rooms = roomsResponse.rooms;
        }
      }
      
      dispatch(setRooms(rooms));
      
      if (userRoomCheck?.inRoom && userRoomCheck?.room?._id) {
        const roomId = userRoomCheck.room._id;
        console.log('User đang ở trong phòng, chuyển đến phòng:', roomId);
        navigate(`/game/${roomId}`, { replace: true });
        return;
      }
      
      if (!roomsResponse) {
        const errorMessage = 'Không thể tải danh sách phòng';
        toast.error(errorMessage);
        dispatch(setRooms([]));
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể tải danh sách phòng';
      toast.error(errorMessage);
      console.error('Lỗi khi tải dữ liệu:', error);
      dispatch(setRooms([]));
    } finally {
      setLoading(false);
    }
  }, [dispatch, navigate]);

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    isUserActiveRef.current = true;
  }, []);

  useEffect(() => {
    const checkAndRefresh = () => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      if (timeSinceLastActivity >= 2000) {
        isUserActiveRef.current = false;
        loadRooms();
      }
    };

    refreshIntervalRef.current = setInterval(checkAndRefresh, 10000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [loadRooms]);

  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      updateActivity();
    };

    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [updateActivity]);

  useEffect(() => {
    const handleLobbyRefresh = () => {
      refreshFromEventRef.current = true;
      loadRooms();
      setTimeout(() => {
        refreshFromEventRef.current = false;
      }, 100);
    };

    window.addEventListener('lobby-refresh', handleLobbyRefresh);
    return () => {
      window.removeEventListener('lobby-refresh', handleLobbyRefresh);
    };
  }, [loadRooms]);

  useEffect(() => {
    if (location.state?.fromGameRoom) {
      loadRooms(800);
      window.history.replaceState({}, document.title);
      return;
    }
    
    const currentPathname = location.pathname;
    const previousPathname = previousPathnameRef.current;
    
    if (refreshFromEventRef.current) {
      previousPathnameRef.current = currentPathname;
      isMountedRef.current = true;
      return;
    }
    
    if (!isMountedRef.current || previousPathname === null) {
      loadRooms();
      isMountedRef.current = true;
    } else if (currentPathname === '/lobby' && previousPathname !== currentPathname && previousPathname !== '') {
      loadRooms();
    }
    
    previousPathnameRef.current = currentPathname;
  }, [location.pathname, location.state, loadRooms]);

  useEffect(() => {
    const handleRoomUpdate = (data) => {
      if (data?.room) {
        dispatch(updateRoom(data.room));
      }
    };

    const handlePlayerJoined = (data) => {
      if (data?.room) {
        dispatch(updateRoom(data.room));
      }
    };

    const handlePlayerLeft = (data) => {
      if (data?.room) {
        dispatch(updateRoom(data.room));
      }
    };

    try {
      gameSocket.onRoomUpdate(handleRoomUpdate);
      gameSocket.onPlayerJoined(handlePlayerJoined);
      gameSocket.onPlayerLeft(handlePlayerLeft);
    } catch (error) {
      console.error('Lỗi khi thiết lập socket listeners:', error);
    }

    return () => {
      try {
        gameSocket.offRoomUpdate(handleRoomUpdate);
        gameSocket.offPlayerJoined(handlePlayerJoined);
        gameSocket.offPlayerLeft(handlePlayerLeft);
      } catch (error) {
        console.error('Lỗi khi dọn dẹp socket listeners:', error);
      }
    };
  }, [dispatch]);


  const handleCreateRoom = () => {
    navigate('/rooms/create');
  };

  const filteredRooms = (rooms || []).filter((room) => {
    if (!room) return false;
    const matchesSearch = room.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'waiting' && room.status === 'waiting') ||
      (filter === 'playing' && room.status === 'playing') ||
      (filter === 'full' && room.players?.length >= room.maxPlayers);
    return matchesSearch && matchesFilter;
  });


  if (!rooms) {
    dispatch(setRooms([]));
  }

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-4 sm:mb-6">
          <LobbyHeader onCreateRoom={handleCreateRoom} />
          <SearchAndFilter
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filter={filter}
            onFilterChange={setFilter}
            onRefresh={loadRooms}
            onActivityUpdate={updateActivity}
          />
        </div>
        <RoomList
          loading={loading}
          filteredRooms={filteredRooms}
          onCreateRoom={handleCreateRoom}
        />
      </div>
    </div>
  );
};

export default Lobby;
