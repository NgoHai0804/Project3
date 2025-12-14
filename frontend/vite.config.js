import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true, // Cho phép truy cập từ bên ngoài (0.0.0.0)
    port: 5173,
    strictPort: false,
    // Cho phép các host ngrok
    allowedHosts: [
      'localhost',
      '.ngrok-free.app', // Cho phép tất cả subdomain ngrok
      '.ngrok.io', // Cho phép tất cả subdomain ngrok cũ
    ],
    hmr: {
      clientPort: 5173, // Port cho HMR
    },
  },
})
