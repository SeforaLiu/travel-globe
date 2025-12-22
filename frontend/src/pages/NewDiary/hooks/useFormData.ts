import { useState } from 'react';
import { FormData, UploadStatus } from '../types';

export const useFormData = (initialData?: Partial<FormData>) => {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    type: 'visited',
    location: '',
    coordinates: null,
    dateStart: '',
    dateEnd:'',
    transportation: '',
    content: '',
    photos: [],
    ...initialData,
  });

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

  const updatePhotoStatus = (index: number, status: UploadStatus, publicId?: string, error?: string) => {
    setFormData(prev => {
      const newPhotos = [...prev.photos];
      if (newPhotos[index]) {
        newPhotos[index] = {
          ...newPhotos[index],
          status,
          publicId,
          error
        };
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
    updatePhotoStatus,
    sortPhotos
  };
};
