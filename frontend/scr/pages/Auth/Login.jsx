// Login - Trang đăng nhập

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { loginStart, loginSuccess, loginFailure } from '../../store/userSlice';
import { authApi } from '../../services/api/authApi';

function Login() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading } = useSelector((state) => state.user);

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Xóa lỗi khi người dùng nhập
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Vui lòng nhập tên đăng nhập';
    }

    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    dispatch(loginStart());

    try {
      const data = await authApi.login(formData);
      
      dispatch(loginSuccess({
        user: {
          id: data.id || data._id,
          username: data.username,
          nickname: data.nickname || data.username,
          avatarUrl: data.avatarUrl,
        },
        token: data.token,
        refreshToken: data.refreshToken,
      }));

      toast.success('Đăng nhập thành công!');
      navigate('/lobby');
    } catch (error) {
      dispatch(loginFailure(error.message));
      toast.error(error.message || 'Đăng nhập thất bại');
    }
  };

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 text-center">Đăng Nhập</h2>
      <p className="text-sm sm:text-base text-gray-600 text-center mb-4 sm:mb-6">Chào mừng bạn trở lại!</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Username */}
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Tên đăng nhập
          </label>
          <input
            type="text"
            id="username"
            name="username"
            value={formData.username}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.username
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Nhập tên đăng nhập"
            disabled={loading}
          />
          {errors.username && (
            <p className="mt-1 text-sm text-red-600">{errors.username}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Mật khẩu
          </label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              errors.password
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder="Nhập mật khẩu"
            disabled={loading}
          />
          {errors.password && (
            <p className="mt-1 text-sm text-red-600">{errors.password}</p>
          )}
        </div>

        {/* Forgot Password Link */}
        <div className="text-right">
          <Link
            to="/auth/forgot-password"
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Quên mật khẩu?
          </Link>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Đang đăng nhập...' : 'Đăng Nhập'}
        </button>

        {/* Register Link */}
        <div className="text-center text-sm text-gray-600">
          <span>Chưa có tài khoản? </span>
          <Link to="/auth/register" className="text-blue-600 hover:text-blue-800 font-medium">
            Đăng ký ngay
          </Link>
        </div>
      </form>
    </div>
  );
}

export default Login;
