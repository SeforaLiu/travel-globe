// src/components/LocationSection.tsx
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import MapPreview from "../../../components/MapPreview";
import LocationSearch from "../../../components/LocationSearch";
import { useTravelStore } from '@/store/useTravelStore';
import LocationSectionSkeleton from "@/components/LocationSectionSkeleton";

type Props = {
  location: string;
  coordinates: { lat: number; lng: number } | null;
  dark: boolean;
  onLocationSelect: (place: any) => void;
  onLocationChange: (value: string) => void;
  onMapClick: (latLng: { lat: number; lng: number }, address: string) => void;
  onInputFocus?: () => void;
  isMobile?: boolean;
  showMapPreview?: boolean;
};

const LocationSection: React.FC<Props> = ({
                                            location,
                                            coordinates,
                                            dark,
                                            onLocationSelect,
                                            onLocationChange,
                                            onMapClick,
                                            onInputFocus,
                                            isMobile = false,
                                            showMapPreview
                                          }) => {
  const { t } = useTranslation();

  // --- 新增逻辑：从 store 获取状态和 action ---
  const {
    loadGoogleMaps,
    isGoogleMapsLoaded,
    isGoogleMapsLoading,
    googleMapsError
  } = useTravelStore();

  // --- 新增逻辑：组件挂载时触发 API 加载 ---
  useEffect(() => {
    // 调用 action 来加载 Google Maps API。
    // store 内部会处理重复加载的问题，所以可以放心调用。
    loadGoogleMaps();
  }, [loadGoogleMaps]); // 依赖项数组确保此 effect 仅在组件挂载时运行一次

  const handleChange = (value: string) => {
    onLocationChange(value);
  };

  // --- 新增逻辑：根据加载状态进行条件渲染 ---

  // 1. 正在加载时，显示骨架屏
  if (isGoogleMapsLoading) {
    return <LocationSectionSkeleton dark={dark} isMobile={isMobile} />;
  }

  // 2. 加载失败时，显示错误信息
  if (googleMapsError) {
    return (
      <div className="mb-6 p-4 border border-red-400 rounded bg-red-50 dark:bg-red-900/20">
        <p className="text-sm text-red-700 dark:text-red-300">
          {t('map_load_error', '地图服务加载失败，请刷新页面重试。')}
        </p>
        <p className="text-xs text-gray-500 mt-1">{googleMapsError}</p>
      </div>
    );
  }

  // 3. 加载成功后，才渲染真正的组件
  // 注意：这里我们用 isGoogleMapsLoaded 作为最终的渲染守卫
  if (!isGoogleMapsLoaded) {
    // 这是一个备用状态，理论上会先进入 isGoogleMapsLoading
    // 但作为保险，如果既没在加载也没加载成功，就什么都不渲染
    return null;
  }


  if (isMobile) {
    return (
      <div className="mb-4">
        <label className={`block text-sm font-medium mb-1 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
          {t('AddLocation')}<span className="text-red-500"> *</span>
        </label>
        <LocationSearch
          onSelect={onLocationSelect}
          value={location}
          onChange={handleChange}
          // @ts-ignore
          onFocus={onInputFocus}
        />
        {coordinates && showMapPreview && (
          <div className="mt-3">
            <MapPreview
              lat={coordinates.lat}
              lng={coordinates.lng}
              dark={dark}
              onMapClick={onMapClick}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
        {t('AddLocation')}<span className="text-red-500"> *</span>
      </label>
      <LocationSearch
        onSelect={onLocationSelect}
        value={location}
        onChange={handleChange}
        // @ts-ignore
        onFocus={onInputFocus}
      />
      {coordinates && showMapPreview && (
        <div className="mt-4">
          <MapPreview
            lat={coordinates.lat}
            lng={coordinates.lng}
            dark={dark}
            onMapClick={onMapClick}
          />
        </div>
      )}
    </div>
  );
};

export default LocationSection;
