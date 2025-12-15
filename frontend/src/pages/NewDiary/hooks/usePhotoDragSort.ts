import { useState } from 'react';

export const usePhotoDragSort = (
  photos: File[],
  onSort: (fromIndex: number, toIndex: number) => void
) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [touchStartPos, setTouchStartPos] = useState({
    x: 0,
    y: 0,
    index: -1,
    isDragging: false,
  });

  const getTouchedPhotoIndex = (clientX: number, clientY: number) => {
    const photoElements = document.querySelectorAll('.mobile-photo-item');
    for (let i = 0; i < photoElements.length; i++) {
      const rect = photoElements[i].getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return parseInt(photoElements[i].getAttribute('data-index') || '-1');
      }
    }
    return -1;
  };

  const handleTouchStart = (e: React.TouchEvent, index: number) => {
    e.stopPropagation();
    const touch = e.touches[0];
    setTouchStartPos({
      x: touch.clientX,
      y: touch.clientY,
      index,
      isDragging: true,
    });
    setDraggedIndex(index);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.isDragging || touchStartPos.index === -1) return;
    e.preventDefault();

    const touch = e.touches[0];
    const targetIndex = getTouchedPhotoIndex(touch.clientX, touch.clientY);

    if (targetIndex !== -1 && draggedIndex !== null && targetIndex !== draggedIndex) {
      onSort(draggedIndex, targetIndex);
      setDraggedIndex(targetIndex);
    }
  };

  const handleTouchEnd = () => {
    setTouchStartPos({ x: 0, y: 0, index: -1, isDragging: false });
    setDraggedIndex(null);
  };

  return {
    draggedIndex,
    touchStartPos,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    setDraggedIndex,
  };
};