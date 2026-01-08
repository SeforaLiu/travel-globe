export type Props = {
  isMobile: boolean;
  onClose: () => void;
  onSubmit: (data: SubmitData) => void; // 直接使用 FormData 类型
  dark: boolean;
  loading:boolean;
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

export type CloudinaryPhotoInfo = {
  publicId: string;
  url: string;
  width: number;
  height: number;
  size: number;
  format: string;
  folder: string;
  originalFilename: string;
  created_at: string;
};

export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

export type FormData = {
  title: string;
  type: 'visited' | 'wishlist';
  location: string;
  coordinates: { lat: number; lng: number } | null;
  dateStart: string; // 格式: 'yyyy-MM-dd'
  dateEnd: string;   // 格式: 'yyyy-MM-dd'
  transportation: string;
  content: string;
  photos: Array<{
    file: File;
    url?: string; // 本地预览URL
    publicId?: string; // Cloudinary public ID
    status: UploadStatus;
    error?: string;
    cloudinary?: CloudinaryPhotoInfo;
  }>;
};

export type SubmitData = {
  title: string;
  type: 'visited' | 'wishlist';
  location: string;
  coordinates: { lat: number; lng: number };
  dateStart: string | null;
  dateEnd: string | null;
  transportation: string;
  content: string;
  photos: Array<{
    url: string;
    public_id: string;
    width: number;
    height: number;
    size: number;
    format: string;
    folder: string;
    original_filename: string;
    created_at: string;
  }>;
};