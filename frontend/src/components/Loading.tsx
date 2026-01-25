import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from "react-i18next";
import GEO_FACT_KEYS from "@/constants/facts";

interface LoadingProps {
  dark?: boolean;
}

const Loading: React.FC<LoadingProps> = ({ dark = false }) => {
  const { t } = useTranslation();

  // --- 状态管理 ---
  const [progress, setProgress] = useState(10);
  const [textIndex, setTextIndex] = useState(0);
  const [isTextVisible, setIsTextVisible] = useState(true);

  // --- 核心修改：生成随机顺序的数组 ---
  // 使用 useMemo 确保只在组件挂载时洗牌一次，后续渲染保持该顺序
  const randomizedFacts = useMemo(() => {
    // 1. 复制原数组，避免修改常量
    const shuffled = [...GEO_FACT_KEYS];

    // 2. Fisher-Yates 洗牌算法
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled;
  }, []); // 空依赖数组，只执行一次

  // --- 1. 进度条逻辑 (保持不变) ---
  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(timer);
          return 95;
        }
        const remaining = 95 - prev;
        const increment = Math.random() * (remaining / 5);
        return prev + (increment < 0.5 ? 0.5 : increment);
      });
    }, 200);
    return () => clearInterval(timer);
  }, []);

  // --- 2. 文字轮播逻辑 (引用 randomizedFacts) ---
  useEffect(() => {
    const intervalDuration = 4000;

    const textTimer = setInterval(() => {
      setIsTextVisible(false);

      setTimeout(() => {
        setTextIndex((prev) => {
          return (prev + 1) % randomizedFacts.length;
        });
        setIsTextVisible(true);
      }, 500);

    }, intervalDuration);

    return () => clearInterval(textTimer);
  }, [randomizedFacts]); // 依赖项加入 randomizedFacts

  // 获取当前文字 显示随机数组中的内容
  const currentText = t(randomizedFacts[textIndex]);

  return (
    <div className={`
      min-h-screen w-full flex flex-col items-center justify-center
      transition-colors duration-500 ease-in-out px-4
      ${dark ? 'bg-gray-950' : 'bg-white'}
    `}>

      {/* Logo 区域 */}
      <div className="mb-10 flex flex-col items-center relative z-10">
        <div className={`
          relative w-24 h-24 mb-6 flex items-center justify-center
          transition-transform duration-700 hover:scale-105
        `}>
          <img
            src="/web-app-manifest-192x192.png"
            alt="App Logo"
            className={"w-full h-full object-contain drop-shadow-lg rounded-full"}
          />
          <div className={`
            absolute inset-0 rounded-full blur-xl -z-10 opacity-40
            ${dark ? 'bg-blue-500' : 'bg-blue-200'}
            animate-pulse
          `}></div>
        </div>

        <h1 className={`
          text-3xl font-bold tracking-wide
          ${dark ? 'text-white' : 'text-gray-800'}
          transition-colors duration-300
        `}>
          {t('title')}
        </h1>
      </div>

      {/* 进度条区域 */}
      <div className="w-full max-w-xs sm:max-w-md relative z-10">
        <div className="flex justify-between text-xs mb-2 font-mono">
          <span className={dark ? 'text-blue-400' : 'text-blue-600'}>Loading</span>
          <span className={dark ? 'text-gray-400' : 'text-gray-500'}>{Math.round(progress)}%</span>
        </div>

        <div className={`
          h-2 rounded-full overflow-hidden
          ${dark ? 'bg-gray-800 shadow-inner' : 'bg-gray-100'}
        `}>
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          >
            <div className="w-full h-full bg-white/20 animate-[shimmer_2s_infinite]"></div>
          </div>
        </div>
      </div>

      {/* 滚动的文字区域 */}
      <div className="mt-8 h-32 w-full max-w-lg flex flex-col items-center justify-start text-center relative z-10">
        <div className={`
          mb-2 px-2 py-0.5 rounded text-[10px] uppercase tracking-widest font-bold
          transition-all duration-500
          ${dark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}
        `}>
          {t('loading.trivia_label')}
        </div>
        <p className={`
          text-sm sm:text-base font-medium leading-relaxed px-4
          transform transition-all duration-500 ease-in-out
          opacity-0 -translate-y-4
          ${isTextVisible ? 'opacity-100 translate-y-0' : ''}
          ${dark ? 'text-gray-300' : 'text-gray-600'}
        `}>
          {currentText}
        </p>
      </div>

    </div>
  );
};

export default Loading;
