import React from 'react';

const DrawRequestModal = ({ 
  isOpen, 
  onClose, 
  onAccept, 
  onReject, 
  onCancel,
  requesterUsername,
  requesterNickname,
  isRequester 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        {isRequester ? (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Đang chờ phản hồi</h2>
            <p className="text-gray-600 mb-4">
              Bạn đã gửi yêu cầu xin hòa. Đang chờ đối thủ phản hồi...
            </p>
            <p className="text-sm text-gray-500 italic">
              Vui lòng đợi đối thủ phản hồi yêu cầu của bạn.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Yêu cầu xin hòa</h2>
            <p className="text-gray-600 mb-4">
              <span className="font-semibold">{requesterNickname || requesterUsername || 'Đối thủ'}</span> muốn xin hòa. 
              Bạn có đồng ý không?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onReject}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Từ chối
              </button>
              <button
                type="button"
                onClick={onAccept}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Đồng ý
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DrawRequestModal;

