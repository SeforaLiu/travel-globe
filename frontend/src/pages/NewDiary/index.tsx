import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DesktopLayout from './layouts/DesktopLayout';
import MobileLayout from './layouts/MobileLayout';
import { useFormData } from './hooks/useFormData';
import { usePhotoDragSort } from './hooks/usePhotoDragSort';
import { useCloudinaryUpload } from './hooks/useCloudinaryUpload';
import { Props, LocationResult } from './types';

export default function NewDiary({ isMobile, onClose, onSubmit, dark }: Props) {
  const { t } = useTranslation();
  const { formData, updateField, addPhotos, removePhoto, sortPhotos, updatePhotoStatus } = useFormData();
  const { uploadPhotos, resetCache } = useCloudinaryUpload();

  const [showMapPreview, setShowMapPreview] = useState(false);

  // 组件卸载时重置上传缓存
  useEffect(() => {
    return () => {
      resetCache();
    };
  }, [resetCache]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 上传所有待上传的图片
    const pendingPhotos = formData.photos.filter(photo => photo.status === 'pending');

    if (pendingPhotos.length > 0) {
      try {
        await uploadPhotos(
          pendingPhotos.map(p => ({
            file: p.file,
            url: p.url,
            status: p.status
          })),
          (index, status, result, error) => {
            // 找到对应的全局索引
            const globalIndex = formData.photos.findIndex(
              (p, idx) => p.status === 'pending' &&
                p.file.name === pendingPhotos[index].file.name &&
                p.file.size === pendingPhotos[index].file.size
            );

            if (globalIndex !== -1) {
              updatePhotoStatus(globalIndex, status, result?.publicId, error);
            }
          }
        );
      } catch (error) {
        console.error('上传过程中出现错误:', error);
        return;
      }
    }

    onSubmit(formData);
  };

  const handleLocationSelect = (place: LocationResult) => {
    console.log('选择了地址', place);
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
    updatePhotoStatus,
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
