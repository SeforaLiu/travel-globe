import React from 'react'
// @ts-ignore
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/index.css'
import './i18n'

// 判断是否为开发环境
// @ts-ignore
if (import.meta.env.MODE === 'development') {
  import('vconsole').then((module) => {
    const VConsole = module.default;
    new VConsole(); // 初始化
  });
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <App />
  </BrowserRouter>
)
