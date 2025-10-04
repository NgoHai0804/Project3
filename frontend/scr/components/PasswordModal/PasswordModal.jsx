import React, { useState } from 'react';
import { roomApi } from '../../services/api/roomApi';

const PasswordModal = ({ isOpen, onClose, onSubmit, roomName, roomId }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!password || !password.trim()) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }

    if (!roomId && !onSubmit) {
      setError('Lỗi: Không có thông tin phòng. Vui lòng thử lại.');
      setTimeout(() => {
        onClose();
      }, 2000);
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      await onSubmit(password.trim());
      setPassword('');
      setError('');
    } catch (err) {
      const errorMessage = err.message || err.response?.data?.message || 'Mật khẩu không đúng';
      setError(errorMessage);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCancel = () => {
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Nhập mật khẩu</h2>
        <p className="text-gray-600 mb-4">Phòng <span className="font-semibold">{roomName}</span> yêu cầu mật khẩu</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Mật khẩu
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError('');
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                error
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="Nhập mật khẩu phòng"
              autoFocus
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isVerifying}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isVerifying ? 'Đang kiểm tra...' : 'Tham gia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordModal;

