import React from 'react';

const LeaveRoomModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  isPlaying = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Thông báo rời phòng</h2>
        <p className="text-gray-600 mb-4">
          {isPlaying 
            ? 'Bạn có chắc chắn muốn rời phòng? Nếu đang chơi, bạn sẽ bị tính là thua.'
            : 'Bạn có chắc chắn muốn rời phòng? Bạn sẽ không thể quay lại phòng này nếu không có mật khẩu.'
          }
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Xác nhận rời phòng
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeaveRoomModal;
