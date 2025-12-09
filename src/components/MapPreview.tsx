import React, { useEffect, useRef } from 'react';

type Props = {
  lat: number;
  lng: number;
  dark?: boolean;
  onMapClick?: (latLng: { lat: number, lng: number }, address: string) => void;
};

export default function MapPreview({ lat, lng, dark = false ,onMapClick}: Props) {
  // 覆盖 google console.warn
  const originalWarn = console.warn;
  console.warn = function(...args) {
    // 检查警告消息是否包含 Google Autocomplete 的弃用信息
    const isGoogleMapsWarning = args.some(arg =>
      typeof arg === 'string' &&
      arg.includes('google.maps.Marker is deprecated')
    );

    // 如果不是目标警告，则调用原始的 warn 函数打印它
    if (!isGoogleMapsWarning) {
      originalWarn.apply(console, args);
    }
  };

  const mapRef = useRef<HTMLDivElement>(null);
  // @ts-ignore
  const mapInstanceRef = useRef<google.maps.Map>();
  // @ts-ignore
  const markerRef = useRef<google.maps.Marker>();

  useEffect(() => {
    console.log('地图previw加载')
    if (!mapRef.current || !lat || !lng) return;

    // @ts-ignore
    if (!window.google) {
      console.error('Google Maps API not loaded');
      return;
    }

    const center = { lat, lng };

    // @ts-ignore
    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center,
      zoom: 14,
      disableDefaultUI: true,
      styles: dark ? [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        // 更多暗色样式...
      ] : [],
    });

    // @ts-ignore
    markerRef.current = new google.maps.Marker({
      position: center,
      map: mapInstanceRef.current,
    });

    // --- 3. 添加地图点击事件监听器和逆地理编码 ---
    if (onMapClick) {
      // @ts-ignore
      const geocoder = new google.maps.Geocoder();

      // @ts-ignore
      mapInstanceRef.current.addListener('click', (event) => {
        const clickLat = event.latLng.lat();
        const clickLng = event.latLng.lng();
        const clickedLatLng = { lat: clickLat, lng: clickLng };

        // 移动 marker 到点击位置
        markerRef.current?.setPosition(clickedLatLng);

        // 执行逆地理编码
        // @ts-ignore
        geocoder.geocode({ 'location': clickedLatLng }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const address = results[0].formatted_address;

            // 调用父组件的回调函数，更新地址和坐标
            onMapClick(clickedLatLng, address);

          } else {
            console.error('Geocoder failed due to: ' + status);
            // 如果逆地理编码失败，至少更新坐标和显示一个提示地址
            onMapClick(clickedLatLng, `坐标: ${clickLat.toFixed(6)}, ${clickLng.toFixed(6)}`);
          }
        });
      });
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null);
      }
      // 清除监听器，避免内存泄漏
      // @ts-ignore
      if (mapInstanceRef.current) {
        // @ts-ignore
        google.maps.event.clearInstanceListeners(mapInstanceRef.current);
      }
    };
  }, [lat, lng, dark, onMapClick]); // 4. 确保 onMapClick 也作为依赖项



  return (
    <div className="mt-4 w-full h-96 border border-gray-300 rounded-lg dark:border-gray-600 overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />
      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        坐标: {lat.toFixed(6)}, {lng.toFixed(6)}
      </div>
    </div>
  );
}