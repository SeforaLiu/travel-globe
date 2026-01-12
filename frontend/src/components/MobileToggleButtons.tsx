// src/components/MobileToggleButtons.tsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTravelStore } from '@/store/useTravelStore';

interface Props {
  onShowSidebar: () => void;
  // onShowRightPanel: () => void;
}

export const MobileToggleButtons: React.FC<Props> = ({ onShowSidebar }) => {
  const location = useLocation();
  const isLoggedIn = useTravelStore((state) => state.isLoggedIn);

  // 只在首页显示
  if (location.pathname !== '/') return null;

  return (
    <>
      <button
        onClick={onShowSidebar}
        className={`absolute top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border ${
          !isLoggedIn ? 'animate-pulse ring-2 ring-blue-500' : ''
        }`}
      >
        ☰
      </button>

      {/*<button*/}
      {/*  onClick={onShowRightPanel}*/}
      {/*  className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border"*/}
      {/*>*/}
      {/*  ✈️*/}
      {/*</button>*/}
    </>
  );
};
