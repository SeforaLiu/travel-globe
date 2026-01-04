import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path' // 需要确保安装了 @types/node

// 如果是 ESM 环境，可以通过以下方式获取 __dirname 的效果
// 或者直接使用 fileURLToPath，但最简单的是直接引入 path

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        rewrite: (path) => path,
        secure: false
      },
    },
  },
  resolve: {
    alias: {
      // 将 @ 指向 src 目录
      "@": path.resolve(__dirname, "./src"),
    },
  },
})