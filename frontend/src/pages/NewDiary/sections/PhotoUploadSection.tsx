// frontend/src/pages/NewDiary/sections/PhotoUploadSection.tsx
import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import PhotoPreviewGrid from '../components/PhotoPreviewGrid';
import { MAX_PHOTOS } from '../../../services/cloudinary';
import { toast } from 'sonner';

type Props = {
  photos: Array<{
    file: File;
    url?: string;
    publicId?: string;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
    cloudinary?: import('../types').CloudinaryPhotoInfo;
  }>;
  dark: boolean;
  onAddPhotos: (files: File[]) => void;
  onRemovePhoto: (index: number) => void;
  onSortPhotos: (fromIndex: number, toIndex: number) => void;
  updatePhotoStatus: (index: number, status: 'pending' | 'uploading' | 'success' | 'error', cloudinary?: import('../types').CloudinaryPhotoInfo, error?: string) => void;
  draggedIndex: number | null;
  onDragStart: (index: number) => void;
  onDragEnter: (e: React.DragEvent, index: number) => void;
  onTouchStart: (e: React.TouchEvent, index: number) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onFocus?: () => void;
  isMobile?: boolean;
};



const PhotoUploadSection: React.FC<Props> = ({
                                               photos,
                                               dark,
                                               onAddPhotos,
                                               onRemovePhoto,
                                               onSortPhotos,
                                               updatePhotoStatus,
                                               draggedIndex,
                                               onDragStart,
                                               onDragEnter,
                                               onTouchStart,
                                               onTouchMove,
                                               onTouchEnd,
                                               onFocus,
                                               isMobile = false,
                                             }) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      if (photos.length + files.length > MAX_PHOTOS) {
        toast.error(`最多只能上传 ${MAX_PHOTOS} 张图片`);
        return;
      }
      onAddPhotos(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragging(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);

      if (photos.length + files.length > MAX_PHOTOS) {
        toast.error(`最多只能上传 ${MAX_PHOTOS} 张图片`);
        return;
      }

      onAddPhotos(files);

      // 清空input值以便再次选择相同文件
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    if (photos.length >= MAX_PHOTOS) {
      toast.error(`最多只能上传 ${MAX_PHOTOS} 张图片`);
      return;
    }
    fileInputRef.current?.click();
  };

  const dropZoneClass = `border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
    isDragging
      ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20'
      : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
  }`;

  if (isMobile) {
    return (
      <div className="mb-4">
        <label className={`block text-sm font-medium mb-2 ${dark ? 'text-gray-300' : 'text-gray-700'}`}>
          {t('AddPhotos')} ({photos.length}/{MAX_PHOTOS})
        </label>
        <button
          type="button"
          className={`w-full py-3 px-4 rounded-lg ${dark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors flex items-center justify-center mb-3`}
          onClick={triggerFileInput}
          disabled={photos.length >= MAX_PHOTOS}
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {t('AddSelectPhotosButton')}
        </button>

        <input
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          id="photo-upload-mobile"
          onChange={handleFileInputChange}
          onFocus={onFocus}
          ref={fileInputRef}
        />

        {photos.length > 0 && (
          <div
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchEnd}
          >
            <PhotoPreviewGrid
              photos={photos}
              dark={dark}
              draggedIndex={draggedIndex}
              onRemove={onRemovePhoto}
              onDragStart={onDragStart}
              onDragEnter={onDragEnter}
              onTouchStart={onTouchStart}
              isMobile={true}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
        {t('AddPhotos')} ({photos.length}/{MAX_PHOTOS})
      </label>
      <div
        className={dropZoneClass}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
      >
        <p className="text-gray-500 dark:text-gray-400">{t('AddSelectPhotosTip')}</p>
        <button
          type="button"
          className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
          disabled={photos.length >= MAX_PHOTOS}
        >
          {t('AddSelectPhotosButton')}
        </button>
      </div>
      <input
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        id="photo-upload"
        onChange={handleFileInputChange}
        onFocus={onFocus}
        ref={fileInputRef}
      />
      {photos.length > 0 && (
        <PhotoPreviewGrid
          photos={photos}
          dark={dark}
          draggedIndex={draggedIndex}
          onRemove={onRemovePhoto}
          onDragStart={onDragStart}
          onDragEnter={onDragEnter}
          className="mt-4"
        />
      )}
    </div>
  );
};

export default PhotoUploadSection;
