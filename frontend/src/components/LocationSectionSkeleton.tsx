// src/components/LocationSectionSkeleton.tsx
import React from 'react';

type Props = {
  dark: boolean;
  isMobile?: boolean;
};

const LocationSectionSkeleton: React.FC<Props> = ({ dark, isMobile = false }) => {
  const baseClass = "bg-gray-300 dark:bg-gray-700 rounded animate-pulse";

  if (isMobile) {
    return (
      <div className="mb-4">
        <div className={`h-5 w-32 mb-2 ${baseClass}`}></div> {/* Label Skeleton */}
        <div className={`h-10 w-full ${baseClass}`}></div>   {/* Input Skeleton */}
      </div>
    );
  }

  return (
    <div className="mb-6">
      <div className={`h-5 w-32 mb-2 ${baseClass}`}></div> {/* Label Skeleton */}
      <div className={`h-10 w-full ${baseClass}`}></div>   {/* Input Skeleton */}
    </div>
  );
};

export default LocationSectionSkeleton;
