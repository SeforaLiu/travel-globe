import React from 'react'
// @ts-ignore
import { createRoot } from 'react-dom/client'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import { useEffect } from 'react';
import App from './App'
import './styles/index.css'
import './i18n'
import {setGlobalNavigate} from "@/utils/navigation";
import {GlobalDataInitializer} from "@/components/App/GlobalDataInitializer";

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

// 定义一个“注入器”组件
const AxiosNavigateSetter = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 将 react-router 的 navigate 实例赋给外部工具
    setGlobalNavigate(navigate);
  }, [navigate]);

  return null;
};

createRoot(document.getElementById('root')!).render(
  <BrowserRouter
    future={{
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    }}
  >
    <AxiosNavigateSetter />
    <GlobalDataInitializer />
    <App />
  </BrowserRouter>
)