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
