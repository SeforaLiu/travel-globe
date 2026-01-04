// src/layouts/MainLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import RightPanel from '@/components/RightPanel';
import { MobileToggleButtons } from '@/components/MobileToggleButtons';
import { useResponsiveLayout } from '@/hooks/useResponsiveLayout';
import { useTravelStore } from '@/store/useTravelStore';

interface Props {
  dark: boolean;
  setDark: (dark: boolean) => void;
}

export const MainLayout: React.FC<Props> = ({ dark, setDark }) => {
  const { isLoggedIn } = useTravelStore();
  const {
    isMobile,
    showSidebar,
    setShowSidebar,
    showRightPanel,
    setShowRightPanel,
    showLeftRightButtonsMobile,
    setShowLeftRightButtonsMobile,
  } = useResponsiveLayout();

  const sidebarDayBg = '#c5d6f0';
  const sidebarNightBg = '#1A1A33';
  const sidebarBg = dark ? sidebarNightBg : sidebarDayBg;
  const textColor = dark ? 'text-white' : 'text-gray-800';

  return (
    <div className="h-screen flex relative">
      {/* 移动端切换按钮 */}
      {isMobile && showLeftRightButtonsMobile && (
        <MobileToggleButtons
          onShowSidebar={() => {
            setShowSidebar(true);
            setShowLeftRightButtonsMobile(false);
          }}
          onShowRightPanel={() => {
            setShowRightPanel(true);
            setShowLeftRightButtonsMobile(false);
          }}
        />
      )}

      {/* 侧边栏 */}
      {showSidebar && (
        <div
          className={`
            fixed inset-y-0 left-0 z-40
            w-64
            bg-white dark:bg-gray-900
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
          />
        </div>
      )}

      {/* 主内容区 */}
      <div
        className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${
          showSidebar && !isMobile ? 'ml-64' : 'ml-0'
        }`}
      >
        <Outlet />
      </div>

      {/* 右侧面板 */}
      {(showRightPanel || !isMobile) && (
        <div
          className={`${
            isMobile ? 'absolute inset-y-0 right-0 z-40 w-64' : 'w-[10%] flex-shrink-0'
          } bg-amber-50 dark:bg-gray-900 transition-all duration-300`}
        >
          <RightPanel />
        </div>
      )}

      {/* 移动端遮罩层 */}
      {isMobile && (showSidebar || showRightPanel) && (
        <div
          className="absolute inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => {
            setShowSidebar(false);
            setShowRightPanel(false);
            setShowLeftRightButtonsMobile(true);
          }}
        />
      )}

      {/* 桌面端打开侧边栏按钮 */}
      {!isMobile && !showSidebar && (
        <div
          className={`absolute left-0 h-full flex flex-col justify-between items-center ${textColor}`}
          style={{ backgroundColor: sidebarBg }}
        >
          <img src="/logo/logo-placeholder-image.png" alt="logo" className="rounded w-10" />
          <button onClick={() => setShowSidebar(true)} className="px-4 py-1 opacity-50 hover:opacity-100">
            {`>`}
          </button>
        </div>
      )}
    </div>
  );
};
