import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import DesktopLayout from './layouts/DesktopLayout';
import MobileLayout from './layouts/MobileLayout';
import { useFormData } from './hooks/useFormData';
import { usePhotoDragSort } from './hooks/usePhotoDragSort';
import { Props, LocationResult } from './types';

export default function NewDiary({ isMobile, onClose, onSubmit, dark }: Props) {
  const { t } = useTranslation();
  const { formData, updateField, addPhotos, removePhoto, sortPhotos, handleDateChange } = useFormData();

  const [showMapPreview, setShowMapPreview] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleLocationSelect = (place: LocationResult) => {
    console.log('选择了地址',place)
    if (place.geometry?.location) {
      const addressText = place.formatted_address || place.name || '';
      const lat = typeof place.geometry.location.lat === 'function'
        ? place.geometry.location.lat()
        : (place.geometry.location.lat as number);
      const lng = typeof place.geometry.location.lng === 'function'
        ? place.geometry.location.lng()
        : (place.geometry.location.lng as number);

      updateField('location', addressText);
      updateField('coordinates', { lat, lng });
      setShowMapPreview(true);
    }
  };

  const handleMapClick = (latLng: { lat: number; lng: number }, address: string) => {
    updateField('location', address);
    updateField('coordinates', latLng);
  };

  const handleLocationChange = (value: string) => {
    updateField('location', value);
    updateField('coordinates', null);
    setShowMapPreview(false);
  };

  const handleInputFocus = () => {
    setShowMapPreview(false);
  };

  const handleLocationInputFocus = () => {
    setShowMapPreview(true);
  };

  const {
    draggedIndex,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    setDraggedIndex,
  } = usePhotoDragSort(formData.photos, sortPhotos);

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== index) {
      sortPhotos(draggedIndex, index);
      setDraggedIndex(index);
    }
  };

  const commonProps = {
    dark,
    formData,
    t,
    onClose,
    handleSubmit,
    updateField,
    addPhotos,
    removePhoto,
    sortPhotos,
    handleLocationSelect,
    handleLocationChange,
    handleMapClick,
    handleInputFocus,
    handleLocationInputFocus,
    showMapPreview,
    draggedIndex,
    handleDragStart: setDraggedIndex,
    handleDragEnter,
    handleDragEnd: () => setDraggedIndex(null),
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  };

  return isMobile ? (
    <MobileLayout {...commonProps} />
  ) : (
    <DesktopLayout {...commonProps} />
  );
}