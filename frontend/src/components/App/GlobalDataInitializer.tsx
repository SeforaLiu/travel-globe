// src/components/App/GlobalDataInitializer.tsx
import { useEffect } from 'react';
import { useTravelStore } from '@/store/useTravelStore';

/**
 * 这个组件不渲染任何UI，它的唯一作用是：
 * 在应用加载后，检查用户认证状态，并获取必要的全局数据。
 * 这样可以确保无论用户从哪个页面进入或刷新，只要是登录状态，
 * 像 allDiaries 这样的全局数据都能被正确加载。
 */
export const GlobalDataInitializer = () => {
  // 从 store 中获取检查认证状态的方法、获取数据的方法以及登录状态
  const checkAuth = useTravelStore((state) => state.checkAuth);
  const fetchAllDiaries = useTravelStore((state) => state.fetchAllDiaries);
  const isLoggedIn = useTravelStore((state) => state.isLoggedIn);
  const allDiariesInitialized = useTravelStore((state) => state.allDiariesInitialized);

  // 效果1: 应用首次加载时，检查用户认证状态
  useEffect(() => {
    checkAuth();
  }, [checkAuth]); // 依赖 checkAuth，确保它只在初始化时运行一次

  // 效果2: 当登录状态变为 true 时，获取全局日记数据
  useEffect(() => {
    // 只有在用户已登录且 allDiaries 尚未初始化时才去获取
    if (isLoggedIn && !allDiariesInitialized) {
      fetchAllDiaries();
    }
  }, [isLoggedIn, allDiariesInitialized, fetchAllDiaries]); // 依赖登录状态和初始化标记

  return null; // 这个组件不产生任何可见的元素
};
