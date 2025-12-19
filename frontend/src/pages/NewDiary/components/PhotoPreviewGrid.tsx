import React from 'react';
// @ts-ignore
import { Image } from 'cloudinary-react';

type Props = {
  photos: Array<{
    file: File;
    url?: string;
    publicId?: string;
    status: 'pending' | 'uploading' | 'success' | 'error';
    error?: string;
  }>;
  dark: boolean;
  draggedIndex: number | null;
  onRemove: (index: number) => void;
  onDragStart: (index: number) => void;
  onDragEnter: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  onTouchStart?: (e: React.TouchEvent, index: number) => void;
  isMobile?: boolean;
  className?: string;
};

const PhotoPreviewGrid: React.FC<Props> = ({
                                             photos,
                                             dark,
                                             draggedIndex,
                                             onRemove,
                                             onDragStart,
                                             onDragEnter,
                                             onDragEnd,
                                             onTouchStart,
                                             isMobile = false,
                                             className = '',
                                           }) => {
  return (
    <div
      className={`${className} ${isMobile ? 'grid grid-cols-3 gap-2' : 'flex max-h-60 overflow-x-auto p-2'}`}
      onDragOver={(e) => e.preventDefault()}
    >
      {photos.map((photo, index) => (
        <div
          key={index}
          className={`relative ${isMobile ? 'aspect-square' : 'w-24 h-24 mr-3'} border rounded-lg overflow-hidden cursor-move mobile-photo-item ${
            draggedIndex === index
              ? 'opacity-50 border-blue-500'
              : dark
                ? 'border-gray-700'
                : 'border-gray-200'
          }`}
          data-index={index}
          draggable={!isMobile}
          onDragStart={() => onDragStart(index)}
          onDragEnter={(e) => onDragEnter(e, index)}
          onDragEnd={onDragEnd}
          onTouchStart={isMobile ? (e) => onTouchStart?.(e, index) : undefined}
        >
          {/* 显示上传状态指示器 */}
          {photo.status === 'uploading' && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-10">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          )}

          {photo.status === 'error' && (
            <div className="absolute inset-0 bg-red-500 bg-opacity-70 flex items-center justify-center z-10">
              <span className="text-white text-xs">!</span>
            </div>
          )}

          {/* 显示图片预览 */}
          {photo.publicId ? (
            // 使用Cloudinary组件显示已上传的图片
            <Image
              publicId={photo.publicId}
              // @ts-ignore
              cloudName={import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}
              width="100"
              height="100"
              crop="fill"
              quality="auto"
              fetchFormat="auto"
              className="w-full h-full object-cover"
              alt={`预览 ${index + 1}`}
            />
          ) : photo.url ? (
            // 显示本地预览
            <img
              src={photo.url}
              alt={`预览 ${index + 1}`}
              className="w-full h-full object-cover"
            />
          ) : (
            // 默认占位符
            <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400 text-xs">加载中...</span>
            </div>
          )}

          <button
            type="button"
            className={`absolute top-1 right-1 ${
              isMobile ? 'w-5 h-5' : 'w-6 h-6'
            } flex items-center justify-center rounded-full ${
              dark ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'
            } text-white transition-colors z-20`}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(index);
            }}
          >
            &times;
          </button>

          {/* 错误提示 */}
          {photo.error && (
            <div className="absolute bottom-0 left-0 right-0 bg-red-500 bg-opacity-90 text-white text-xs p-1 truncate">
              {photo.error}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PhotoPreviewGrid;
