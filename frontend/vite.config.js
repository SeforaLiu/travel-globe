import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000', // 明确使用IPv4地址
        changeOrigin: true,
        rewrite: (path) => path,  // 修改这里，保留完整路径
        secure: false
      },
    },
  },
})