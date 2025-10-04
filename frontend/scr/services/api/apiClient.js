import axios from 'axios';
import { API_URL } from '../../config/api.config';
import { storage, STORAGE_KEYS } from '../../utils/storage';
import store from '../../store';
import { logout, updateToken } from '../../store/userSlice';
import { socketClient } from '../socket/socketClient';
import { authApi } from './authApi';

/**
 * Axios instance chung cho tất cả API calls
 * Tự động thêm token vào header nếu có
 */
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Danh sách các endpoint public không cần token
const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/refresh',
];

// Interceptor để thêm token vào request
apiClient.interceptors.request.use(
  (config) => {
    // Kiểm tra endpoint có phải public không
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint => 
      config.url?.includes(endpoint)
    );
    
    // Chỉ thêm token nếu không phải endpoint public
    if (!isPublicEndpoint) {
      // Lấy token từ Redux store hoặc storage
      const state = store.getState();
      let token = state.user?.token || storage.get(STORAGE_KEYS.TOKEN);
      
      if (token) {
        // Loại bỏ dấu ngoặc kép nếu có
        if (typeof token === 'string') {
          token = token.replace(/^"(.*)"$/, '$1').trim();
        }
        
        // Chỉ thêm token nếu không phải null, undefined, hoặc rỗng
        if (token && token !== 'null' && token !== 'undefined') {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }
    
    // Bypass ngrok warning page cho API requests (nếu đang dùng ngrok)
    if (config.baseURL?.includes('ngrok')) {
      config.headers['ngrok-skip-browser-warning'] = 'true';
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Xử lý logout khi không xác thực được
const handleUnauthorized = () => {
  // Dispatch logout action để cập nhật Redux store
  store.dispatch(logout());
  
  // Disconnect socket nếu có
  if (socketClient && typeof socketClient.forceDisconnect === 'function') {
    socketClient.forceDisconnect();
  }
  
  // Redirect về trang đăng nhập
  // Sử dụng window.location để đảm bảo reload và clear state
  if (window.location.pathname !== '/auth/login' && window.location.pathname !== '/auth/register') {
    window.location.href = '/auth/login';
  }
};

// Biến để tránh refresh token nhiều lần đồng thời
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Interceptor để xử lý response
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Xử lý lỗi 401 - Unauthorized
    if (error.response?.status === 401) {
      const url = originalRequest?.url || '';
      const isPublicEndpoint = PUBLIC_ENDPOINTS.some(endpoint => 
        url.includes(endpoint)
      );
      
      // Chỉ hiển thị warning và xử lý logout nếu không phải endpoint public
      // Với endpoint public (login/register), 401 có thể là do sai username/password
      // và đây là lỗi hợp lệ, không phải do token
      if (!isPublicEndpoint) {
        // Tránh retry vô hạn - nếu request đã được retry rồi thì không retry nữa
        if (originalRequest._retry) {
          console.warn('Request đã được retry, không retry lại');
          handleUnauthorized();
          return Promise.reject(error);
        }

        // Nếu đây là request refresh token bị lỗi, logout ngay
        if (url.includes('/auth/refresh')) {
          console.warn('Refresh token không hợp lệ, đăng xuất');
          handleUnauthorized();
          return Promise.reject(error);
        }

        // Nếu đang refresh token, thêm request vào queue
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          })
            .then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              originalRequest._retry = true;
              return apiClient(originalRequest);
            })
            .catch(err => {
              return Promise.reject(err);
            });
        }

        // Lấy refresh token từ storage hoặc Redux store
        const state = store.getState();
        const refreshToken = state.user?.refreshToken || storage.get(STORAGE_KEYS.REFRESH_TOKEN);
        
        if (!refreshToken) {
          console.warn('Không có refresh token, đăng xuất');
          handleUnauthorized();
          return Promise.reject(error);
        }

        // Bắt đầu refresh token
        isRefreshing = true;
        originalRequest._retry = true;

        try {
          const response = await authApi.refresh(refreshToken);
          // authApi.refresh trả về response.data.data || response.data, nên token sẽ ở response.token
          const newToken = response.token;

          if (newToken) {
            // Cập nhật token mới vào store và storage
            store.dispatch(updateToken({ token: newToken }));
            
            // Cập nhật header cho request gốc
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            
            // Xử lý queue
            processQueue(null, newToken);
            isRefreshing = false;

            // Retry request gốc với token mới
            return apiClient(originalRequest);
          } else {
            throw new Error('Không nhận được token mới');
          }
        } catch (refreshError) {
          // Refresh token thất bại, logout
          processQueue(refreshError, null);
          isRefreshing = false;
          console.warn('Refresh token thất bại:', refreshError);
          handleUnauthorized();
          return Promise.reject(refreshError);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

