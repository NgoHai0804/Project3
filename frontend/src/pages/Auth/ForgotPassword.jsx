// ForgotPassword - Trang quên mật khẩu

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authApi } from '../../services/api/authApi';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'email') setEmail(value);
    else if (name === 'code') setCode(value);
    else if (name === 'newPassword') setNewPassword(value);
    else if (name === 'confirmPassword') setConfirmPassword(value);
    
    // Xóa lỗi khi người dùng nhập
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateEmail = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateReset = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (!code.trim()) {
      newErrors.code = 'Vui lòng nhập mã xác nhận';
    } else if (!/^\d{6}$/.test(code.trim())) {
      newErrors.code = 'Mã xác nhận phải là 6 chữ số';
    }

    if (!newPassword) {
      newErrors.newPassword = 'Vui lòng nhập mật khẩu mới';
    } else if (newPassword.length < 8 || newPassword.length > 20) {
      newErrors.newPassword = 'Mật khẩu phải có từ 8 đến 20 ký tự';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Vui lòng xác nhận mật khẩu';
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!validateEmail()) {
      return;
    }

    setSendingCode(true);

    try {
      await authApi.forgotPassword(email);
      toast.success('Mã xác nhận đã được gửi đến email của bạn!');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!validateReset()) {
      return;
    }

    setLoading(true);

    try {
      await authApi.resetPassword(email, code, newPassword);
      toast.success('Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.');
      navigate('/auth/login');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 text-center">
        Quên Mật Khẩu
      </h2>
      <p className="text-sm sm:text-base text-gray-600 text-center mb-4 sm:mb-6">
        Nhập mã xác nhận và mật khẩu mới
      </p>

      <form onSubmit={handleResetPassword} className="space-y-4">
        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.email
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Nhập email của bạn"
            disabled={loading}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        {/* Mã xác nhận với nút Gửi */}
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
            Mã xác nhận
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              id="code"
              name="code"
              value={code}
              onChange={handleChange}
              maxLength={6}
              className={`flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                errors.code
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="Nhập mã xác nhận"
              disabled={loading}
            />
            <button
              type="button"
              onClick={handleSendCode}
              disabled={loading || sendingCode}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {sendingCode ? 'Đang gửi...' : 'Gửi'}
            </button>
          </div>
          {errors.code && (
            <p className="mt-1 text-sm text-red-600">{errors.code}</p>
          )}
        </div>

        {/* Mật khẩu mới */}
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Mật khẩu mới
          </label>
          <input
            type="password"
            id="newPassword"
            name="newPassword"
            value={newPassword}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.newPassword
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Nhập mật khẩu mới (8-20 ký tự)"
            disabled={loading}
          />
          {errors.newPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>
          )}
        </div>

        {/* Xác nhận mật khẩu */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
            Xác nhận mật khẩu
          </label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={confirmPassword}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.confirmPassword
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Nhập lại mật khẩu mới"
            disabled={loading}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
        </button>

        {/* Back to Login Link */}
        <div className="text-center text-sm text-gray-600">
          <Link to="/auth/login" className="text-blue-600 hover:text-blue-800 font-medium">
            Quay lại đăng nhập
          </Link>
        </div>
      </form>
    </div>
  );
}

export default ForgotPassword;
