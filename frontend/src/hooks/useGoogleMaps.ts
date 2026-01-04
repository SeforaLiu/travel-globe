// src/hooks/useGoogleMaps.ts
import { useEffect } from 'react';

// @ts-ignore
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;

export const useGoogleMaps = () => {
  useEffect(() => {
    // 防止重复加载
    // @ts-ignore
    if (window.google?.maps) {
      console.log('Google Maps API 已存在');
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      // @ts-ignore
      console.log('✅ Google Maps API 加载完毕', window.google);
    };

    script.onerror = () => {
      console.error('❌ 加载 Google Maps API 失败');
      // 实际项目中建议上报监控
    };

    document.head.appendChild(script);

    return () => {
      // 注意：通常不卸载 Google Maps 脚本，避免其他模块使用时重新加载
      // 如需清理，可在此移除 script 标签
    };
  }, []);
};
