import React from 'react';

type Props = {
  photos: File[];
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
          <img
            src={URL.createObjectURL(photo)}
            alt={`预览 ${index + 1}`}
            className="w-full h-full object-cover"
          />
          <button
            type="button"
            className={`absolute top-1 right-1 ${
              isMobile ? 'w-5 h-5' : 'w-6 h-6'
            } flex items-center justify-center rounded-full ${
              dark ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'
            } text-white transition-colors`}
            onClick={(e) => {
              e.stopPropagation();
              onRemove(index);
            }}
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
};

export default PhotoPreviewGrid;