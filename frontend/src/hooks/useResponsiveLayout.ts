// src/hooks/useResponsiveLayout.ts
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {useTravelStore} from "@/store/useTravelStore";

export const useResponsiveLayout = () => {
  const location = useLocation();
  const setShowLeftRightButtonsMobile = useTravelStore(state => state.setShowLeftRightButtonsMobile)
  const showSidebar = useTravelStore(state => state.showSidebar)
  const setShowSidebar = useTravelStore(state => state.setShowSidebar)

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768
      if (!mobile) {
        // 桌面端：默认显示所有面板
        setShowSidebar(true);
        setShowLeftRightButtonsMobile(false);
      } else {
        setShowSidebar(false);
        setShowLeftRightButtonsMobile(location.pathname === '/');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, [location.pathname]);

  return {
    showSidebar,
    setShowSidebar,
  };
};
