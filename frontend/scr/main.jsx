import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import App from './App.jsx'
import store from './store'
import { cleanupToken } from './utils/tokenHelper'
import './index.css'

// Cleanup token khi app khởi động
cleanupToken()

// Áp dụng theme - luôn sử dụng chế độ sáng
const htmlElement = document.documentElement;

// Luôn remove class dark và set theme thành light
htmlElement.classList.remove('dark');
localStorage.setItem('theme', 'light');

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Provider store={store}>
            <BrowserRouter>
                <App />
                <ToastContainer position="top-right" autoClose={1000} />
            </BrowserRouter>
        </Provider>
    </React.StrictMode>,
)