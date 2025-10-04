// Cấu hình API và Socket Server
// Có thể thay đổi bằng file .env hoặc sửa giá trị mặc định bên dưới

// API Server URL
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Socket Server URL
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';

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

