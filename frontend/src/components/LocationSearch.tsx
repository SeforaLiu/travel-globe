// LocationSearch.tsx
import React, { useEffect, useRef, useState } from 'react';

type Props = {
  // @ts-ignore
  onSelect: (place: google.maps.places.PlaceResult) => void;
  value: string;
  onChange: (value: string) => void;
  onFocus: () => void;
};

export default function LocationSearch({ onSelect, value, onChange, onFocus }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  // @ts-ignore
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(value);
  const [isInitialized, setIsInitialized] = useState(false);

  // 覆盖 google console.warn
  const originalWarn = console.warn;
  console.warn = function(...args) {
    const isGoogleMapsWarning = args.some(arg =>
      typeof arg === 'string' &&
      arg.includes('google.maps.places.Autocomplete is not available to new customers')
    );
    if (!isGoogleMapsWarning) {
      originalWarn.apply(console, args);
    }
  };

  // 同步外部value到内部状态
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const initializeAutocomplete = () => {
    // @ts-ignore
    if (!inputRef.current || !window.google || !window.google.maps || !window.google.maps.places) {
      return;
    }

    // 清除之前的监听器
    if (autocompleteRef.current) {
      // @ts-ignore
      google.maps.event.clearInstanceListeners(autocompleteRef.current);
    }

    try {
      // 创建新的Autocomplete实例
      // @ts-ignore
      autocompleteRef.current = new google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ['geocode'],
          fields: ['formatted_address', 'geometry', 'name'],
        }
      );

      // 添加place_changed事件监听
      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place?.geometry?.location && place.formatted_address) {
          onSelect(place);
          setInputValue(place.formatted_address);
        }
      });
      console.log('Autocomplete初始化成功');
      setIsInitialized(true);
    } catch (error) {
      console.error('Autocomplete初始化失败:', error);
    }
  };

  useEffect(() => {
    // 确保Google Maps API已加载
    const checkApiLoaded = () => {
      // @ts-ignore
      if (window.google?.maps?.places) {
        initializeAutocomplete();
      } else {
        setTimeout(checkApiLoaded, 100);
      }
    };
    console.log('组件---location search')
    checkApiLoaded();

    return () => {
      if (autocompleteRef.current) {
        // @ts-ignore
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);
  };

  const handleFocus = () => {
    // 每次获得焦点时重新初始化以确保正常工作
    initializeAutocomplete();
    onFocus();
  };

  return (
    <input
      ref={inputRef}
      type="text"
      className="w-full p-2 border rounded"
      value={inputValue}
      onChange={handleInputChange}
      placeholder="搜索地点..."
      onFocus={handleFocus}
    />
  );
}
