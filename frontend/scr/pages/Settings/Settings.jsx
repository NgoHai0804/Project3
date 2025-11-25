import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    theme: 'light', // Luôn sử dụng chế độ sáng
    boardColorTheme: localStorage.getItem('boardColorTheme') || 'default',
  });

  // Áp dụng theme - luôn sử dụng chế độ sáng
  const applyTheme = (theme) => {
    const htmlElement = document.documentElement;
    htmlElement.classList.remove('dark');
  };

  // Áp dụng theme khi component mount - luôn sử dụng chế độ sáng
  useEffect(() => {
    const theme = 'light';
    localStorage.setItem('theme', theme);
    setSettings(prev => ({ ...prev, theme }));
    applyTheme(theme);
  }, []);

  // Áp dụng theme khi settings.theme thay đổi
  useEffect(() => {
    if (!settings.theme) return;
    applyTheme(settings.theme);
  }, [settings.theme]);

  const handleToggle = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    localStorage.setItem(key, value.toString());
    toast.success(`Đã ${value ? 'bật' : 'tắt'} ${getSettingLabel(key)}`);
  };

  const handleRadioChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    localStorage.setItem(key, value);
    // Dispatch custom event để các component khác có thể lắng nghe
    window.dispatchEvent(new CustomEvent('boardThemeChanged', { detail: { theme: value } }));
    toast.success(`Đã cập nhật ${getSettingLabel(key)}`);
  };

  const getSettingLabel = (key) => {
    const labels = {
      boardColorTheme: 'màu sắc bàn cờ',
    };
    return labels[key] || key;
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-5 md:mb-6">Cài đặt</h1>

      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        {/* Board Settings */}
        <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4 md:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Bàn cờ</h2>
          
          <div className="space-y-3 sm:space-y-4">
            <div>
              <label className="block text-sm sm:text-base font-medium mb-3 sm:mb-4">Màu sắc bàn cờ</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { value: 'default', label: 'Mặc định', color: 'bg-gray-100 border border-gray-300' },
                  { value: 'wood', label: 'Gỗ', color: 'bg-amber-100 border border-amber-300' },
                  { value: 'blue', label: 'Xanh dương', color: 'bg-blue-100 border border-blue-300' },
                  { value: 'dark', label: 'Tối', color: 'bg-gray-700 border border-gray-600' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={`relative flex flex-col items-center justify-center p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                      settings.boardColorTheme === option.value
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="boardColorTheme"
                      value={option.value}
                      checked={settings.boardColorTheme === option.value}
                      onChange={(e) => handleRadioChange('boardColorTheme', e.target.value)}
                      className="sr-only"
                    />
                    <div className={`w-full h-12 sm:h-16 rounded-md mb-2 sm:mb-3 ${option.color} shadow-inner`}></div>
                    <span className={`text-xs sm:text-sm font-medium ${
                      settings.boardColorTheme === option.value ? 'text-blue-600' : 'text-gray-700'
                    }`}>
                      {option.label}
                    </span>
                    {settings.boardColorTheme === option.value && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </label>
                ))}
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-3 sm:mt-4">Chọn màu sắc cho bàn cờ</p>
            </div>
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4 md:p-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Tài khoản</h2>
          
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm sm:text-base mb-1">Quản lý tài khoản</p>
                <p className="text-xs sm:text-sm text-gray-500">Xem và chỉnh sửa thông tin tài khoản của bạn</p>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-sm sm:text-base font-medium whitespace-nowrap shadow-sm hover:shadow-md"
              >
                Đi đến Profile
              </button>
            </div>
          </div>
        </div>

        {/* Logout Button */}
        <div className="flex justify-center pt-2 sm:pt-3 md:pt-4 pb-2 sm:pb-4">
          <button
            onClick={() => {
              if (window.confirm('Bạn có chắc chắn muốn đăng xuất?')) {
                logout();
                navigate('/auth/login');
                toast.success('Đã đăng xuất thành công');
              }
            }}
            className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors font-medium text-sm sm:text-base shadow-sm hover:shadow-md"
          >
            Đăng xuất
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
