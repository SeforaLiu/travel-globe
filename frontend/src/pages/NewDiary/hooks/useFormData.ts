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

  // 更新照片状态（通过文件标识符）
  const updatePhotoStatusByFile = (
    file: File,
    status: UploadStatus,
    cloudinary?: CloudinaryPhotoInfo,
    error?: string
  ) => {
    console.log('通过文件更新照片状态:', {
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
          hasCloudinary: !!updatedPhoto.cloudinary,
          error: updatedPhoto.error
        });

        newPhotos[index] = updatedPhoto;
      } else {
        console.warn('未找到匹配的照片进行更新:', file.name);
      }

      return { ...prev, photos: newPhotos };
    });
  };

  // 更新照片状态（通过索引）
  const updatePhotoStatusByIndex = (
    index: number,
    status: UploadStatus,
    cloudinary?: CloudinaryPhotoInfo,
    error?: string
  ) => {
    console.log('通过索引更新照片状态:', {
      index,
      status,
      hasCloudinary: !!cloudinary,
      hasError: !!error
    });

    setFormData(prev => {
      if (index < 0 || index >= prev.photos.length) {
        console.warn('照片索引超出范围:', index);
        return prev;
      }

      const newPhotos = [...prev.photos];
      const updatedPhoto = {
        ...newPhotos[index],
        status,
        cloudinary,
        error
      };

      newPhotos[index] = updatedPhoto;
      return { ...prev, photos: newPhotos };
    });
  };

  // 重试所有失败的照片
  const retryFailedPhotos = () => {
    console.log('重试所有失败的照片');

    setFormData(prev => {
      const newPhotos = prev.photos.map(photo => {
        if (photo.status === 'error') {
          console.log(`重试照片: ${photo.file.name}`);
          return {
            ...photo,
            status: 'pending' as UploadStatus,
            error: undefined  // 清除错误信息
          };
        }
        return photo;
      });
      return { ...prev, photos: newPhotos };
    });
  };

  // 重试指定索引的照片
  const retryPhotoByIndex = (index: number) => {
    console.log('重试指定照片，索引:', index);

    setFormData(prev => {
      if (index < 0 || index >= prev.photos.length) {
        console.warn('照片索引超出范围:', index);
        return prev;
      }

      const newPhotos = [...prev.photos];
      const photo = newPhotos[index];

      if (photo.status === 'error') {
        console.log(`重试照片: ${photo.file.name}`);
        newPhotos[index] = {
          ...photo,
          status: 'pending' as UploadStatus,
          error: undefined
        };
      } else {
        console.log(`照片状态不是error，无需重试: ${photo.file.name} (${photo.status})`);
      }

      return { ...prev, photos: newPhotos };
    });
  };

  // 重试指定文件
  const retryPhotoByFile = (file: File) => {
    console.log('重试指定文件:', file.name);

    setFormData(prev => {
      const newPhotos = [...prev.photos];
      const index = newPhotos.findIndex(photo =>
        photo.file.name === file.name &&
        photo.file.size === file.size &&
        photo.file.type === file.type
      );

      if (index !== -1) {
        const photo = newPhotos[index];
        if (photo.status === 'error') {
          console.log(`重试照片: ${photo.file.name}`);
          newPhotos[index] = {
            ...photo,
            status: 'pending' as UploadStatus,
            error: undefined
          };
        } else {
          console.log(`照片状态不是error，无需重试: ${photo.file.name} (${photo.status})`);
        }
      } else {
        console.warn('未找到匹配的照片进行重试:', file.name);
      }

      return { ...prev, photos: newPhotos };
    });
  };

  // 获取需要上传的照片（pending 或 error 状态）
  const getPhotosToUpload = () => {
    return formData.photos.filter(photo =>
      photo.status === 'pending' || photo.status === 'error'
    );
  };

  // 检查是否有未完成的上传
  const hasUnfinishedUploads = () => {
    return formData.photos.some(photo =>
      photo.status === 'pending' || photo.status === 'uploading'
    );
  };

  // 检查是否有上传失败的图片
  const hasFailedUploads = () => {
    return formData.photos.some(photo => photo.status === 'error');
  };

  // 获取失败的照片列表
  const getFailedPhotos = () => {
    return formData.photos.filter(photo => photo.status === 'error');
  };

  // 获取成功的照片列表
  const getSuccessPhotos = () => {
    return formData.photos.filter(photo => photo.status === 'success');
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
    formDataRef,
    setFormData,
    updateFormData,
    updateField,
    addPhotos,
    removePhoto,
    updatePhotoStatusByFile,
    updatePhotoStatusByIndex,
    sortPhotos,
    retryFailedPhotos,
    retryPhotoByIndex,
    retryPhotoByFile,
    getPhotosToUpload,
    hasUnfinishedUploads,
    hasFailedUploads,
    getFailedPhotos,
    getSuccessPhotos
  };
};
