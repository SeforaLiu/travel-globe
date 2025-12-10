import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import MapPreview from "../../../components/MapPreview";
import LocationSearch from "../../../components/LocationSearch";

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

  // const handleFocus = () => {
  //   setShowMapPreview(true);
  //   onInputFocus?.();
  // };

  const handleChange = (value: string) => {
    onLocationChange(value);
  };

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