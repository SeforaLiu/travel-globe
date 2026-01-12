// src/hooks/useResponsiveLayout.ts
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {useTravelStore} from "@/store/useTravelStore";

export const useResponsiveLayout = () => {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const setShowLeftRightButtonsMobile = useTravelStore(state => state.setShowLeftRightButtonsMobile)

  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      if (!mobile) {
        // 桌面端：默认显示所有面板
        setShowSidebar(true);
        setShowRightPanel(true);
        setShowLeftRightButtonsMobile(false);
      } else {
        // 移动端：默认隐藏面板，首页显示按钮
        setShowSidebar(false);
        setShowRightPanel(false);
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
    showRightPanel,
    setShowRightPanel,
  };
};
