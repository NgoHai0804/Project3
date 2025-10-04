import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROOM_STATUS } from '../../utils/constants';
import PasswordModal from '../PasswordModal/PasswordModal';

const RoomCard = ({ room }) => {
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleJoin = () => {
    if (room.passwordHash) {
      setShowPasswordModal(true);
    } else {
      navigate(`/game/${room._id}`);
    }
  };

  const handlePasswordSubmit = (password) => {
    setShowPasswordModal(false);
    navigate(`/game/${room._id}`, { state: { password } });
  };

  const handlePasswordCancel = () => {
    setShowPasswordModal(false);
  };

  const getStatusBadge = () => {
    switch (room.status) {
      case ROOM_STATUS.WAITING:
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">Đang chờ</span>;
      case ROOM_STATUS.PLAYING:
        return <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Đang chơi</span>;
      case ROOM_STATUS.ENDED:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">Đã kết thúc</span>;
      default:
        return null;
    }
  };

  const isFull = room.players?.length >= room.maxPlayers;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800">{room.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            {getStatusBadge()}
            {room.passwordHash && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">🔒 Có mật khẩu</span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Người chơi:</span>
          <span className="font-medium">
            {room.players?.length || 0} / {room.maxPlayers}
          </span>
        </div>
        {room.hostUsername && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Chủ phòng:</span>
            <span className="font-medium">{room.hostUsername}</span>
          </div>
        )}
      </div>

      <button
        onClick={handleJoin}
        disabled={isFull || room.status === ROOM_STATUS.PLAYING}
        className={`
          w-full py-2 px-4 rounded-lg font-medium transition-colors
          ${isFull || room.status === ROOM_STATUS.PLAYING
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
          }
        `}
      >
        {isFull ? 'Phòng đầy' : room.status === ROOM_STATUS.PLAYING ? 'Đang chơi' : 'Tham gia'}
      </button>

      <PasswordModal
        isOpen={showPasswordModal}
        onClose={handlePasswordCancel}
        onSubmit={handlePasswordSubmit}
        roomName={room.name}
        roomId={room._id}
      />
    </div>
  );
};

export default RoomCard;
