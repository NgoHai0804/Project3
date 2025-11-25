import { createSlice } from '@reduxjs/toolkit';
import { storage, STORAGE_KEYS } from '../utils/storage';

const initialState = {
  user: storage.get(STORAGE_KEYS.USER, null),
  token: storage.get(STORAGE_KEYS.TOKEN, null),
  refreshToken: storage.get(STORAGE_KEYS.REFRESH_TOKEN, null),
  isAuthenticated: !!storage.get(STORAGE_KEYS.TOKEN, null),
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      state.error = null;
      
      storage.set(STORAGE_KEYS.USER, action.payload.user);
      storage.set(STORAGE_KEYS.TOKEN, action.payload.token);
      if (action.payload.refreshToken) {
        storage.set(STORAGE_KEYS.REFRESH_TOKEN, action.payload.refreshToken);
      }
    },
    updateToken: (state, action) => {
      state.token = action.payload.token;
      storage.set(STORAGE_KEYS.TOKEN, action.payload.token);
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.error = null;
      
      // Xóa localStorage
      storage.remove(STORAGE_KEYS.USER);
      storage.remove(STORAGE_KEYS.TOKEN);
      storage.remove(STORAGE_KEYS.REFRESH_TOKEN);
    },
    updateProfile: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      storage.set(STORAGE_KEYS.USER, state.user);
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, updateProfile, clearError, updateToken } = userSlice.actions;
export default userSlice.reducer;
