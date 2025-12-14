// Cấu hình API và Socket Server
// Có thể thay đổi bằng file .env hoặc sửa giá trị mặc định bên dưới

// Tự động nhận URL từ window.location trong production
const getBaseUrl = () => {
  // Ưu tiên biến môi trường
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Tự động detect URL hiện tại trong production
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    const origin = window.location.origin;
    // Nếu đang chạy trên render.com hoặc domain khác
    if (origin.includes('onrender.com') || origin.includes('https://')) {
      return origin;
    }
  }
  
  // Mặc định cho development
  return 'http://localhost:3000';
};

// API Server URL
export const API_URL = getBaseUrl();

// Socket Server URL
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_URL;

// Config object
export const apiConfig = {
  apiUrl: API_URL,
  socketUrl: SOCKET_URL,
};

// Log config trong development
if (import.meta.env.DEV) {
  console.log('API Config:', {
    apiUrl: API_URL,
    socketUrl: SOCKET_URL,
    env: {
      VITE_API_URL: import.meta.env.VITE_API_URL,
      VITE_SOCKET_URL: import.meta.env.VITE_SOCKET_URL,
    },
  });
}

