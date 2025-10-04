import React from 'react';

const KickPlayerModal = ({ 
  isOpen, 
  onClose, 
  onConfirm,
  playerName
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl p-4 sm:p-6 w-full max-w-md my-auto">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">Xác nhận đuổi người chơi</h2>
        <p className="text-gray-600 mb-6 text-sm sm:text-base">
          Bạn có chắc chắn muốn đuổi <span className="font-semibold">{playerName}</span> ra khỏi phòng? Hành động này không thể hoàn tác.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 sm:py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base font-medium"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base font-medium"
          >
            Đồng ý
          </button>
        </div>
      </div>
    </div>
  );
};

export default KickPlayerModal;
