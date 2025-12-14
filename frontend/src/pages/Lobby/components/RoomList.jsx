import React from 'react';
import RoomCard from '../../../components/RoomCard/RoomCard';

const RoomList = ({ loading, filteredRooms, onCreateRoom }) => {
  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Đang tải...</p>
      </div>
    );
  }

  if (filteredRooms.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12 bg-white rounded-lg shadow p-4 sm:p-6">
        <p className="text-gray-600 text-base sm:text-lg">Không có phòng nào</p>
        <button
          onClick={onCreateRoom}
          className="mt-4 px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base"
        >
          Tạo phòng đầu tiên
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {filteredRooms.map((room) => (
        <RoomCard key={room._id} room={room} />
      ))}
    </div>
  );
};

export default RoomList;
