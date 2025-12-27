import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { roomApi } from '../../services/api/roomApi';
import { gameSocket } from '../../services/socket/gameSocket';

const CreateRoom = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const inviteFriendId = location.state?.inviteFriendId;
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    turnTimeLimit: 30,
    mode: 'P2P', // P2P hoặc P2B
    botDifficulty: 'medium', // easy, medium, hard
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'turnTimeLimit' ? parseInt(value) : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập tên phòng';
    }
    if (formData.turnTimeLimit < 10 || formData.turnTimeLimit > 300) {
      newErrors.turnTimeLimit = 'Thời gian mỗi lượt phải từ 10 đến 300 giây';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      // Kiểm tra user có đang trong phòng nào không
      try {
        const userRoomCheck = await roomApi.checkUserRoom();
        if (userRoomCheck?.inRoom && userRoomCheck?.room) {
          const existingRoom = userRoomCheck.room;
          const existingRoomId = existingRoom._id || existingRoom.id;
          
          toast.info('Bạn đang ở trong phòng khác, đang chuyển đến phòng đó...', {
            position: "top-right",
            autoClose: 2000,
          });
          
          // Chuyển đến phòng hiện tại
          navigate(`/game/${existingRoomId}`);
          return;
        }
      } catch (checkError) {
        console.log('Không thể kiểm tra phòng hiện tại:', checkError);
      }

      const response = await roomApi.createRoom({
        name: formData.name,
        password: formData.password,
        turnTimeLimit: formData.turnTimeLimit,
        maxPlayers: 2,
        mode: formData.mode,
        botDifficulty: formData.mode === 'P2B' ? formData.botDifficulty : undefined,
      });
      const room = response.room || response.data || response;
      const roomId = room._id || room.id;
      
      if (formData.password) {
        sessionStorage.setItem(`room_password_${roomId}`, formData.password);
      }
      
      const isExistingRoom = response.message?.includes('đang ở trong phòng');
      if (isExistingRoom) {
        toast.info('Bạn đang ở trong phòng này', {
          position: "top-right",
          autoClose: 1000,
        });
      } else {
        toast.success('Tạo phòng thành công!', {
          position: "top-right",
          autoClose: 1000,
        });
      }
      
      if (inviteFriendId) {
        setTimeout(() => {
          gameSocket.inviteToRoom(roomId, inviteFriendId);
          toast.info('Đã gửi lời mời đến bạn bè', {
            position: "top-right",
            autoClose: 1000,
          });
        }, 1000);
      }
      
      navigate(`/game/${roomId}`);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Không thể tạo phòng';
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 1000,
      });
      console.error('Lỗi khi tạo phòng:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-3 sm:p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-4 sm:p-6 lg:p-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6">Tạo phòng mới</h1>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Room Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Tên phòng
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.name
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="Nhập tên phòng"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Mật khẩu (tùy chọn)
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Để trống nếu không muốn đặt mật khẩu"
              />
            </div>

            {/* Game Mode */}
            <div>
              <label htmlFor="mode" className="block text-sm font-medium text-gray-700 mb-2">
                Chế độ chơi
              </label>
              <select
                id="mode"
                name="mode"
                value={formData.mode}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="P2P">Người vs Người</option>
                <option value="P2B">Người vs Bot</option>
              </select>
            </div>

            {/* Bot Difficulty (chỉ hiện khi chọn P2B) */}
            {formData.mode === 'P2B' && (
              <div>
                <label htmlFor="botDifficulty" className="block text-sm font-medium text-gray-700 mb-2">
                  Độ khó Bot
                </label>
                <select
                  id="botDifficulty"
                  name="botDifficulty"
                  value={formData.botDifficulty}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="easy">Dễ</option>
                  <option value="medium">Trung bình</option>
                  <option value="hard">Khó</option>
                </select>
                <p className="mt-1 text-sm text-gray-500">
                  Bot sẽ tự động chơi khi đến lượt. Độ khó càng cao, bot càng thông minh.
                </p>
              </div>
            )}

            {/* Turn Time Limit */}
            <div>
              <label htmlFor="turnTimeLimit" className="block text-sm font-medium text-gray-700 mb-2">
                Thời gian mỗi lượt đi (giây)
              </label>
              <input
                type="number"
                id="turnTimeLimit"
                name="turnTimeLimit"
                min="10"
                max="300"
                value={formData.turnTimeLimit}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.turnTimeLimit
                    ? 'border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                placeholder="30"
              />
              <p className="mt-1 text-sm text-gray-500">
                Thời gian tối thiểu: 10s, tối đa: 300s. Nếu hết thời gian sẽ tự động thua.
              </p>
              {errors.turnTimeLimit && (
                <p className="mt-1 text-sm text-red-600">{errors.turnTimeLimit}</p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => navigate('/lobby')}
                className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm sm:text-base"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:flex-1 px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {loading ? 'Đang tạo...' : 'Tạo phòng'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateRoom;
