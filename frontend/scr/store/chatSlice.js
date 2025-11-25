import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  messages: [],
  unreadCount: 0,
  loading: false,
  error: null,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action) => {
      state.messages.push(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },
    setMessages: (state, action) => {
      state.messages = action.payload;
      state.unreadCount = action.payload.filter(m => !m.read).length;
    },
    markAsRead: (state, action) => {
      const messageId = action.payload;
      const message = state.messages.find(m => m.id === messageId);
      if (message && !message.read) {
        message.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsRead: (state) => {
      state.messages.forEach(m => m.read = true);
      state.unreadCount = 0;
    },
    clearMessages: (state) => {
      state.messages = [];
      state.unreadCount = 0;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const {
  addMessage,
  setMessages,
  markAsRead,
  markAllAsRead,
  clearMessages,
  setLoading,
  setError,
} = chatSlice.actions;
export default chatSlice.reducer;
