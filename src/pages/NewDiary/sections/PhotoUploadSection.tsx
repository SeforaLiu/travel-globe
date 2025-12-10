import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PhotoPreviewGrid from '../components/PhotoPreviewGrid';

type Props = {
  photos: File[];
  dark: boolean;
  onAddPhotos: (files: File[]) => void;
  onRemovePhoto: (index: number) => void;
  onSortPhotos: (fromIndex: number, toIndex: number) => void;
  draggedIndex: number | null;
  onDragStart: (index: number) => void;
  onDragEnter: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
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
                                               draggedIndex,
                                               onDragStart,
                                               onDragEnter,
                                               onDragEnd,
                                               onTouchStart,
                                               onTouchMove,
                                               onTouchEnd,
                                               onFocus,
                                               isMobile = false,
                                             }) => {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(file =>
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
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
      onAddPhotos(Array.from(e.target.files));
    }
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
          {t('AddPhotos')}
        </label>
        <button
          type="button"
          className={`w-full py-3 px-4 rounded-lg ${dark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white transition-colors flex items-center justify-center mb-3`}
          onClick={() => document.getElementById('photo-upload-mobile')?.click()}
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
              onDragEnd={onDragEnd}
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
        {t('AddPhotos')}
      </label>
      <div
        className={dropZoneClass}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('photo-upload')?.click()}
      >
        <p className="text-gray-500 dark:text-gray-400">{t('AddSelectPhotosTip')}</p>
        <input
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          id="photo-upload"
          onChange={handleFileInputChange}
          onFocus={onFocus}
        />
        <button
          type="button"
          className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          {t('AddSelectPhotosButton')}
        </button>
      </div>
      {photos.length > 0 && (
        <PhotoPreviewGrid
          photos={photos}
          dark={dark}
          draggedIndex={draggedIndex}
          onRemove={onRemovePhoto}
          onDragStart={onDragStart}
          onDragEnter={onDragEnter}
          onDragEnd={onDragEnd}
          className="mt-4"
        />
      )}
    </div>
  );
};

export default PhotoUploadSection;