// storage.js - Bọc localStorage

export const storage = {
  set(key, value) {
    try {
      // Nếu là string (như token), lưu trực tiếp không dùng JSON.stringify
      if (typeof value === 'string') {
        localStorage.setItem(key, value);
      } else {
        const serialized = JSON.stringify(value);
        localStorage.setItem(key, serialized);
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      
      // Thử parse JSON, nếu fail thì trả về string trực tiếp
      try {
        const parsed = JSON.parse(item);
        // Nếu parse ra là string có dấu ngoặc kép, loại bỏ chúng
        if (typeof parsed === 'string' && parsed.startsWith('"') && parsed.endsWith('"')) {
          return parsed.slice(1, -1);
        }
        return parsed;
      } catch {
        // Nếu không parse được JSON, trả về string trực tiếp
        // Loại bỏ dấu ngoặc kép nếu có
        if (item.startsWith('"') && item.endsWith('"')) {
          return item.slice(1, -1);
        }
        return item;
      }
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },

  clear() {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  },
};

// Keys
export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  REFRESH_TOKEN: 'refresh_token',
  USER: 'user_data',
  SETTINGS: 'user_settings',
};
