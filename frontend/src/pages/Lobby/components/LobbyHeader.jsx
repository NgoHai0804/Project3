import React from 'react';

const LobbyHeader = ({ onCreateRoom }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Sảnh chờ</h1>
      <button
        onClick={onCreateRoom}
        className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
      >
        + Tạo phòng mới
      </button>
    </div>
  );
};

export default LobbyHeader;
