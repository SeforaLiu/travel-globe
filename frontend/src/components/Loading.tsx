import React from 'react';
import {useTranslation} from "react-i18next";

interface LoadingProps {
  dark?: boolean;
}

const Loading: React.FC<LoadingProps> = ({ dark = false }) => {
  const {t} = useTranslation()
  return (
    <div className={`
      min-h-screen flex flex-col items-center justify-center
      transition-colors duration-300
      ${dark ? 'bg-gray-900' : 'bg-white'}
    `}>
      {/* Logo 或品牌标识 */}
      <div className="mb-8 flex flex-col items-center">
        <div className={`
          w-16 h-16 rounded-full flex items-center justify-center mb-4
          ${dark ? 'bg-blue-900' : 'bg-blue-100'}
          transition-colors duration-300
        `}>
          <div className={`
            w-8 h-8 rounded-full
            ${dark ? 'bg-blue-400' : 'bg-blue-500'}
            animate-pulse
          `}></div>
        </div>

        <h1 className={`
          text-2xl font-bold mb-2
          ${dark ? 'text-white' : 'text-gray-800'}
          transition-colors duration-300
        `}>
          {t('title')}
        </h1>
      </div>

      {/* 主要的加载动画 */}
      <div className="relative">
        {/* 旋转的圆环 */}
        <div className={`
          w-16 h-16 border-4 border-t-transparent
          rounded-full
          animate-spin
          ${dark ? 'border-blue-400 border-r-gray-700' : 'border-blue-500 border-r-gray-200'}
          transition-colors duration-300
        `}></div>

        {/* 中心的点 */}
        <div className={`
          absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
          w-4 h-4 rounded-full
          ${dark ? 'bg-blue-400' : 'bg-blue-500'}
          animate-pulse
        `}></div>
      </div>

      {/* 加载文字 */}
      <div className="mt-6 text-center">
        <p className={`
          text-lg font-medium
          ${dark ? 'text-gray-300' : 'text-gray-600'}
          transition-colors duration-300
        `}>
          Loading...
        </p>
        <p className={`
          mt-2 text-sm
          ${dark ? 'text-gray-400' : 'text-gray-500'}
          transition-colors duration-300
        `}>
          {t('Preparing your travel experience')}
        </p>
      </div>

      {/* 进度条动画（可选） */}
      <div className={`
        mt-8 w-48 h-1 rounded-full overflow-hidden
        ${dark ? 'bg-gray-700' : 'bg-gray-200'}
        transition-colors duration-300
      `}>
        <div className={`
          h-full bg-gradient-to-r from-blue-400 to-blue-600
          animate-pulse
          w-1/3
        `}></div>
      </div>

      {/* 装饰性元素 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className={`
              absolute rounded-full opacity-10
              ${dark ? 'bg-blue-400' : 'bg-blue-300'}
              animate-pulse
              ${i === 0 ? 'w-32 h-32 top-10 left-10' : ''}
              ${i === 1 ? 'w-24 h-24 bottom-20 right-20' : ''}
              ${i === 2 ? 'w-16 h-16 top-1/3 right-1/4' : ''}
              ${i === 3 ? 'w-20 h-20 bottom-1/4 left-1/3' : ''}
              ${i === 4 ? 'w-28 h-28 top-20 left-1/2' : ''}
            `}
            style={{
              animationDelay: `${i * 0.5}s`,
              animationDuration: '3s'
            }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default Loading;
