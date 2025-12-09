// LocationSearch.tsx
import React, { useEffect, useRef, useState } from 'react';

type Props = {
  onSelect: (place: google.maps.places.PlaceResult) => void;
  value: string;
  onChange: (value: string) => void;
};

export default function LocationSearch({ onSelect, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(value);

  // 处理 google warning
  const originalWarn = console.warn;
  console.warn = function(...args) {
    // 检查警告消息是否包含 Google Autocomplete 的弃用信息
    const isGoogleMapsWarning = args.some(arg =>
      typeof arg === 'string' &&
      arg.includes('google.maps.places.Autocomplete is not available to new customers')
    );
    // 如果不是目标警告，则调用原始的 warn 函数打印它
    if (!isGoogleMapsWarning) {
      originalWarn.apply(console, args);
    }
  };

  // 同步外部value到内部状态
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    // 确保Google Maps API已加载
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.warn('Google Maps API not loaded yet');
      return;
    }

    if (!inputRef.current) return;

    // 清除之前的监听器
    if (autocompleteRef.current) {
      // @ts-ignore
      google.maps.event.clearInstanceListeners(autocompleteRef.current);
    }

    try {
      // 创建新的Autocomplete实例
      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ['geocode'],
          fields: ['formatted_address', 'geometry', 'name'],
        }
      );

      // 添加place_changed事件监听
      autocompleteRef.current.addListener('place_changed', () => {
        console.log('place_changed事件触发');
        const place = autocompleteRef.current?.getPlace();
        console.log('获取到的place:', place);

        if (place && place.geometry && place.formatted_address) {
          console.log('有效的地点被选择:', place.formatted_address);
          onSelect(place);

          // 同步输入框的值
          const addressText = place.formatted_address || place.name || '';
          setInputValue(addressText);

          // 通知父组件输入框值变化（可选）
          // onChange(addressText);
        } else {
          console.warn('获取的地点信息不完整:', place);
        }
      });

      console.log('Autocomplete已初始化');

    } catch (error) {
      console.error('Autocomplete初始化失败:', error);
    }

    // 清理函数
    return () => {
      if (autocompleteRef.current) {
        try {
          // @ts-ignore
          google.maps.event.clearInstanceListeners(autocompleteRef.current);
        } catch (e) {
          console.error('清除监听器失败:', e);
        }
      }
    };
  }, [onSelect]); // 注意：只在onSelect改变时重新初始化

  // 处理手动输入
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    console.log('手动输入改变:', newValue);

    setInputValue(newValue);
    onChange(newValue);
  };

  // 处理失去焦点
  const handleBlur = () => {
    // 如果输入框值与当前值不同，同步一下
    if (inputValue !== value) {
      onChange(inputValue);
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      className="w-full p-2 border rounded"
      value={inputValue}
      onChange={handleInputChange}
      onBlur={handleBlur}
      placeholder="搜索地点..."
    />
  );
}