// ForgotPassword - Trang quên mật khẩu

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authApi } from '../../services/api/authApi';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { value } = e.target;
    setEmail(value);
    // Xóa lỗi khi người dùng nhập
    if (errors.email) {
      setErrors((prev) => ({
        ...prev,
        email: '',
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!email.trim()) {
      newErrors.email = 'Vui lòng nhập email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
      toast.success('Email đã được gửi! Vui lòng kiểm tra hộp thư của bạn.');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 text-center">
          Email đã được gửi
        </h2>
        <p className="text-sm sm:text-base text-gray-600 text-center mb-4 sm:mb-6">
          Chúng tôi đã gửi mật khẩu mới đến email của bạn. Vui lòng kiểm tra hộp thư và đăng nhập lại.
        </p>
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Lưu ý:</strong> Mật khẩu mới đã được gửi đến email <strong>{email}</strong>. 
              Vui lòng kiểm tra cả thư mục spam nếu bạn không thấy email.
            </p>
          </div>
          <Link
            to="/auth/login"
            className="block w-full text-center bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Quay lại đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 text-center">
        Quên Mật Khẩu
      </h2>
      <p className="text-sm sm:text-base text-gray-600 text-center mb-4 sm:mb-6">
        Nhập email của bạn để nhận mật khẩu mới
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Đang gửi...' : 'Gửi mật khẩu mới'}
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
