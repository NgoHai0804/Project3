import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  rooms: [],
  currentRoom: null,
  loading: false,
  error: null,
};

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {
    setRooms: (state, action) => {
      state.rooms = action.payload;
    },
    addRoom: (state, action) => {
      const room = action.payload;
      const exists = state.rooms.find(r => r._id === room._id);
      if (!exists) {
        state.rooms.push(room);
      }
    },
    removeRoom: (state, action) => {
      state.rooms = state.rooms.filter(r => r._id !== action.payload);
    },
    updateRoom: (state, action) => {
      const updatedRoom = action.payload;
      const index = state.rooms.findIndex(r => r._id === updatedRoom._id);
      if (index !== -1) {
        state.rooms[index] = updatedRoom;
      }
      if (state.currentRoom?._id === updatedRoom._id) {
        state.currentRoom = updatedRoom;
      }
    },
    setCurrentRoom: (state, action) => {
      state.currentRoom = action.payload;
    },
    clearCurrentRoom: (state) => {
      state.currentRoom = null;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setRooms,
  addRoom,
  removeRoom,
  updateRoom,
  setCurrentRoom,
  clearCurrentRoom,
  setLoading,
  setError,
  clearError,
} = roomSlice.actions;
export default roomSlice.reducer;
