// src/hooks/useResponsiveLayout.ts
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {useTravelStore} from "@/store/useTravelStore";

export const useResponsiveLayout = () => {
  const location = useLocation();
  const setShowLeftRightButtonsMobile = useTravelStore(state => state.setShowLeftRightButtonsMobile)
  const isMobile = useTravelStore(state => state.isMobile)
  const showSidebar = useTravelStore(state => state.showSidebar)
  const setShowSidebar = useTravelStore(state => state.setShowSidebar)

  useEffect(() => {
    const checkScreenSize = () => {
      if (!isMobile) {
        // 桌面端：默认显示所有面板
        setShowSidebar(true);
        setShowLeftRightButtonsMobile(false);
      } else {
        // 移动端：默认隐藏面板，首页显示按钮
        setShowSidebar(false);
        setShowLeftRightButtonsMobile(location.pathname === '/');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, [location.pathname]);

  return {
    isMobile,
    showSidebar,
    setShowSidebar,
  };
};
