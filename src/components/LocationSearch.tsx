import React, { useEffect, useRef } from 'react';

type Props = {
  // @ts-ignore
  onSelect: (place: google.maps.places.PlaceResult) => void;
  value: string;
  onChange: (value: string) => void;
};

export default function LocationSearch({ onSelect, value, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  // @ts-ignore
  const autocompleteRef = useRef<google.maps.places.Autocomplete>();

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

  useEffect(() => {
    // @ts-ignore
    if (!window.google || !inputRef.current) return;

    // @ts-ignore
    autocompleteRef.current = new window.google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ['geocode'],
        fields: ['formatted_address', 'geometry'],
      }
    );

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (place && place.geometry) {
        onSelect(place);
      }
    });


    console.log('autocompleteRef',autocompleteRef.current)
    console.log('inputRef',inputRef.current)

    return () => {
      if (autocompleteRef.current) {
        // @ts-ignore
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onSelect]);


  return (
    <input
      ref={inputRef}
      type="text"
      className="w-full p-2 border rounded"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="搜索地点..."
    />
  );
}
