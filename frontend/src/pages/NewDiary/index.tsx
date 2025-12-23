// frontend/src/pages/NewDiary/index.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import DesktopLayout from './layouts/DesktopLayout';
import MobileLayout from './layouts/MobileLayout';
import { useFormData } from './hooks/useFormData';
import { usePhotoDragSort } from './hooks/usePhotoDragSort';
import { useCloudinaryUpload } from './hooks/useCloudinaryUpload';
import { Props, LocationResult } from './types';

export default function NewDiary({ isMobile, onClose, onSubmit, dark }: Props) {
  const { t } = useTranslation();
  const {
    formData,
    updateField,
    addPhotos,
    removePhoto,
    sortPhotos,
    updatePhotoStatusByFile
  } = useFormData();
  const { uploadPhotos, resetCache } = useCloudinaryUpload();

  const [showMapPreview, setShowMapPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // 使用 useRef 来获取最新的 formData
  const formDataRef = useRef(formData);
  // 同步最新的 formData 到 ref
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // 组件卸载时重置上传缓存
  useEffect(() => {
    return () => {
      resetCache();
    };
  }, [resetCache]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 防止重复提交
    if (isUploading) {
      console.log('正在上传中，请稍候...');
      return;
    }

    // 首先检查是否有待上传的图片
    const pendingPhotos = formData.photos.filter(photo => photo.status === 'pending');

    if (pendingPhotos.length > 0) {
      try {
        setIsUploading(true);
        console.log('开始上传图片，待上传数量:', pendingPhotos.length);

        // **改进：使用 Promise.all 等待所有上传完成**
        const uploadResults = await uploadPhotos(
          pendingPhotos.map(p => ({
            file: p.file,
            url: p.url,
            status: p.status
          })),
          (index, status, result, error) => {
            // 使用文件来更新状态，避免索引问题
            const targetFile = pendingPhotos[index].file;

            console.log('上传最终状态回调:', {
              index,
              targetFileName: targetFile.name,
              status,
              hasResult: !!result
            });

            // 只在最终状态（success/error）时更新
            if (status === 'success' || status === 'error') {
              updatePhotoStatusByFile(
                targetFile,
                status,
                status === 'success' ? result : undefined,
                error
              );
            }
          }
        );

        console.log('上传完成，返回结果数量:', uploadResults.length);
        console.log('上传完成后的formData.photos:', formDataRef.current.photos);

      } catch (error) {
        console.error('上传过程中出现错误:', error);
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    // 等待状态完全更新（确保React状态更新完成）
    await new Promise(resolve => setTimeout(resolve, 100));

    // 再次检查所有图片是否都已上传成功
    const currentFormData = formDataRef.current;
    const allPhotosUploaded = currentFormData.photos.every(photo =>
      photo.status === 'success' || photo.status === 'error' // 允许成功或有明确错误的图片
    );

    // 检查是否有上传失败的图片
    const failedPhotos = currentFormData.photos.filter(p => p.status === 'error');
    if (failedPhotos.length > 0) {
      console.error('有图片上传失败:', failedPhotos.map(p => ({
        fileName: p.file.name,
        error: p.error
      })));
      // 这里可以决定是否阻止提交，或者允许提交但忽略失败的图片
      // 暂时为了用户体验，允许提交
    }

    // 检查是否所有图片都有最终状态（没有pending或uploading状态）
    const hasUnfinishedPhotos = currentFormData.photos.some(photo =>
      photo.status === 'pending' || photo.status === 'uploading'
    );

    if (hasUnfinishedPhotos) {
      console.error('仍有图片未完成上传，无法提交');
      console.log('当前照片状态:', currentFormData.photos.map(p => ({
        fileName: p.file.name,
        status: p.status,
        hasCloudinary: !!p.cloudinary,
        error: p.error
      })));

      return;
    }

    console.log('index.tsx------formData.photos', currentFormData.photos);

    // 准备提交的数据，过滤掉失败的图片
    const photosToSubmit = currentFormData.photos
      .filter(photo => photo.status === 'success' && photo.cloudinary)
      .map(photo => ({
        url: photo.cloudinary!.url,
        public_id: photo.cloudinary!.publicId,
        width: photo.cloudinary!.width,
        height: photo.cloudinary!.height,
        size: photo.cloudinary!.size,
        format: photo.cloudinary!.format,
        folder: photo.cloudinary!.folder,
        originalFilename: photo.cloudinary!.originalFilename,
        created_at: photo.cloudinary!.created_at
      }));

    const submitData = {
      ...currentFormData,
      photos: photosToSubmit
    };

    console.log('index.tsx-----submitData',submitData)

    onSubmit(submitData);
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
    updatePhotoStatus: updatePhotoStatusByFile,
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
