import React from 'react'
// @ts-ignore
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/index.css'
import './i18n'

// 判断是否为移动端
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )
}

// 判断是否为开发环境且移动端
// @ts-ignore
if (import.meta.env.MODE === 'development' && isMobileDevice()) {
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