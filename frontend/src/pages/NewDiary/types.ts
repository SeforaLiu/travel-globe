export type Props = {
  isMobile: boolean;
  dark: boolean;
  onClose: () => void;
  shouldFetchDiaryDetail?: boolean;
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
    file: File | null;
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