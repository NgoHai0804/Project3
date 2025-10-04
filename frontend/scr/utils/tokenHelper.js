// tokenHelper.js - Xử lý token, loại bỏ dấu ngoặc kép và format đúng

export const cleanToken = (token) => {
  if (!token) return null;
  
  // Nếu là string, loại bỏ dấu ngoặc kép và khoảng trắng
  if (typeof token === 'string') {
    return token.replace(/^"(.*)"$/, '$1').trim();
  }
  
  return token;
};

export const getTokenFromStorage = () => {
  try {
    const token = localStorage.getItem('auth_token');
    return cleanToken(token);
  } catch (error) {
    console.error('Error getting token from storage:', error);
    return null;
  }
};

export const saveTokenToStorage = (token) => {
  try {
    const cleanedToken = cleanToken(token);
    // Lưu token dạng string thuần, không dùng JSON.stringify
    localStorage.setItem('auth_token', cleanedToken);
  } catch (error) {
    console.error('Error saving token to storage:', error);
  }
};

// Cleanup token cũ nếu có dấu ngoặc kép
export const cleanupToken = () => {
  try {
    const token = localStorage.getItem('auth_token');
    if (token) {
      const cleaned = cleanToken(token);
      if (cleaned !== token) {
        localStorage.setItem('auth_token', cleaned);
        console.log('Token cleaned up');
      }
    }
  } catch (error) {
    console.error('Error cleaning up token:', error);
  }
};

