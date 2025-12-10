import { TFunction } from 'i18next';

export type FormData = {
  title: string;
  type: 'visited' | 'wishlist';
  location: string;
  coordinates: { lat: number; lng: number } | null;
  dateRange: [Date | null, Date | null];
  transportation: string;
  content: string;
  photos: File[];
};

export type Props = {
  isMobile: boolean;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
  dark: boolean;
};

export type LocationResult = {
  geometry?: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
  formatted_address?: string;
  name?: string;
};

export type FormHandlers = {
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  updateField: <K extends keyof FormData>(field: K, value: FormData[K]) => void;
  addPhotos: (files: File[]) => void;
  removePhoto: (index: number) => void;
  sortPhotos: (fromIndex: number, toIndex: number) => void;
  handleLocationSelect: (place: LocationResult) => void;
  handleLocationChange: (value: string) => void;
  handleMapClick: (latLng: { lat: number; lng: number }, address: string) => void;
  handleInputFocus: () => void;
  handleLocationInputFocus: () => void;
};

export type PhotoDragHandlers = {
  draggedIndex: number | null;
  handleDragStart: (index: number) => void;
  handleDragEnter: (e: React.DragEvent, index: number) => void;
  handleDragEnd: () => void;
  handleTouchStart: (e: React.TouchEvent, index: number) => void;
  handleTouchMove: (e: React.TouchEvent) => void;
  handleTouchEnd: () => void;
  setDraggedIndex: (index: number | null) => void;
};