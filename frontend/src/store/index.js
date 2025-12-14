import { configureStore } from '@reduxjs/toolkit'
import userReducer from './userSlice'
import gameReducer from './gameSlice'
import roomReducer from './roomSlice'
import chatReducer from './chatSlice'
import notificationReducer from './notificationSlice'

const store = configureStore({
    reducer: {
        user: userReducer,
        game: gameReducer,
        room: roomReducer,
        chat: chatReducer,
        notification: notificationReducer,
    },
})

export default store