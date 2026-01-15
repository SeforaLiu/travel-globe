// src/layouts/MainLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import { MobileToggleButtons } from '@/components/MobileToggleButtons';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useTravelStore } from '@/store/useTravelStore';
import { AIChatWidget } from "@/components/AIChatWidget";
import { ChevronRight } from 'lucide-react';

interface Props {
  dark: boolean;
  setDark: (dark: boolean) => void;
  handleClickLogout: () => void
}

export const MainLayout: React.FC<Props> = ({ dark, setDark, handleClickLogout }) => {
  const showLeftRightButtonsMobile = useTravelStore(state => state.showLeftRightButtonsMobile)
  const setShowLeftRightButtonsMobile = useTravelStore(state => state.setShowLeftRightButtonsMobile)
  const isLoggedIn = useTravelStore(state => state.isLoggedIn)

  const {
    isMobile,
    showSidebar,
    setShowSidebar,
  } = useResponsiveLayout();

  // 更新背景色变量，与新的 Sidebar.tsx 保持完全一致
  const sidebarDayBg = '#eef2f6'; // 更柔和的浅蓝灰
  const sidebarNightBg = '#0f172a'; // 深蓝黑 (Slate-900)
  const sidebarBg = dark ? sidebarNightBg : sidebarDayBg;

  return (
    <div className="h-screen flex relative bg-white dark:bg-slate-900 overflow-x-hidden">
      {location.pathname === '/' ? <AIChatWidget isMobile={isMobile} dark={dark} /> : null}

      {/* 移动端切换按钮 */}
      {isMobile && showLeftRightButtonsMobile && (
        <MobileToggleButtons
          onShowSidebar={() => {
            setShowSidebar(true);
            setShowLeftRightButtonsMobile(false);
          }}
        />
      )}

      {/* 侧边栏 */}
      {/*
        这里保持 showSidebar 的判断逻辑，但容器的样式可以简化，
        因为 Sidebar 组件现在自己管理背景色和阴影
      */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40
          w-72
          transition-transform duration-300 ease-in-out
          ${showSidebar ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar
          dark={dark}
          setDark={setDark}
          isMobile={isMobile}
          toggleSidebar={() => setShowSidebar(false)}
          hideMobileButtons={() => setShowLeftRightButtonsMobile(false)}
          isLoggedIn={isLoggedIn}
          handleClickLogout={handleClickLogout}
          handleShowSidebar={()=>{
            setShowSidebar(true);
            setShowLeftRightButtonsMobile(false);
          }}
        />
      </div>

      {/* 主内容区 */}
      <div
        className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${
          showSidebar && !isMobile ? 'ml-72' : 'ml-0'
        }`}
      >
        <Outlet />
      </div>

      {/* 移动端遮罩层 */}
      {isMobile && showSidebar && (
        <div
          className="absolute inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => {
            setShowSidebar(false);
            setShowLeftRightButtonsMobile(true);
          }}
        />
      )}

      {/* 桌面端打开侧边栏的“停靠栏” */}
      {!isMobile && !showSidebar && (
        <div
          className={`
            absolute left-0 top-0 h-full z-30
            w-16 flex flex-col items-center justify-between py-5
            border-r transition-colors duration-300
            ${dark ? 'border-slate-800' : 'border-slate-200'}
          `}
          style={{ backgroundColor: sidebarBg }}
        >
          {/* Top: Logo */}
          <div className="cursor-pointer" onClick={() => setShowSidebar(true)}>
            <img
              src="/logo/logo-placeholder-image.png"
              alt="logo"
              className="w-10 h-10 rounded-xl shadow-md hover:scale-105 transition-transform"
            />
          </div>

          {/* Bottom: Expand Button */}
          <button
            onClick={() => setShowSidebar(true)}
            className={`
              p-2 rounded-lg transition-colors
              ${dark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-500 hover:bg-slate-100'}
            `}
            title="Open sidebar"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      )}
    </div>
  );
};
