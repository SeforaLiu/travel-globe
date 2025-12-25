// frontend/src/pages/NewDiary/hooks/useFormData.ts
import { useState, useRef , useEffect} from 'react';
import { FormData, UploadStatus, CloudinaryPhotoInfo } from '../types';

export const useFormData = (initialData?: Partial<FormData>) => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    type: 'visited',
    location: '',
    coordinates: null,
    dateStart: '',
    dateEnd: '',
    transportation: '',
    content: '',
    photos: [],
    ...initialData,
  });

  // 使用 useRef 来获取最新的 formData
  const formDataRef = useRef(formData);
  // 同步最新的 formData 到 ref
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateField = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addPhotos = (newPhotos: File[]) => {
    console.log('添加照片', newPhotos.length);
    setFormData(prev => ({
      ...prev,
      photos: [
        ...prev.photos,
        ...newPhotos.map(file => ({
          file,
          url: URL.createObjectURL(file),
          status: 'pending' as UploadStatus,
        }))
      ],
    }));
  };

  const removePhoto = (index: number) => {
    setFormData(prev => {
      const newPhotos = [...prev.photos];
      const removedPhoto = newPhotos.splice(index, 1)[0];

      // 清理预览URL
      if (removedPhoto.url) {
        URL.revokeObjectURL(removedPhoto.url);
      }

      return { ...prev, photos: newPhotos };
    });
  };

  // 添加一个基于文件标识符的更新方法，避免索引问题
  const updatePhotoStatusByFile = (
    file: File,
    status: UploadStatus,
    cloudinary?: CloudinaryPhotoInfo,
    error?: string
  ) => {
    console.log('======通过文件更新照片状态=====', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      status,
      hasCloudinary: !!cloudinary,
      hasError: !!error
    });

    setFormData(prev => {
      const newPhotos = [...prev.photos];
      const index = newPhotos.findIndex(photo =>
        photo.file.name === file.name &&
        photo.file.size === file.size &&
        photo.file.type === file.type
      );

      if (index !== -1) {
        const updatedPhoto = {
          ...newPhotos[index],
          status,
          cloudinary,
          error
        };

        console.log('找到并更新照片索引:', index, {
          status: updatedPhoto.status,
          hasCloudinary: !!updatedPhoto.cloudinary
        });

        newPhotos[index] = updatedPhoto;
      } else {
        console.warn('未找到匹配的照片进行更新:', file.name);
      }

      return { ...prev, photos: newPhotos };
    });
  };

  const sortPhotos = (fromIndex: number, toIndex: number) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= formData.photos.length ||
      toIndex >= formData.photos.length
    ) {
      return;
    }

    const newPhotos = [...formData.photos];
    const [movedPhoto] = newPhotos.splice(fromIndex, 1);
    newPhotos.splice(toIndex, 0, movedPhoto);

    updateField('photos', newPhotos);
  };

  return {
    formData,
    setFormData,
    updateFormData,
    updateField,
    addPhotos,
    removePhoto,
    updatePhotoStatusByFile, // 新增
    sortPhotos
  };
};
