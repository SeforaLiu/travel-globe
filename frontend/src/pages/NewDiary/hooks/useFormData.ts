import { useState, useCallback, useRef, useEffect } from 'react';
import { FormData, UploadStatus, CloudinaryPhotoInfo } from '../types';

// 定义一个初始状态常量，避免在 Hook 内部重复创建对象
const initialFormData: FormData = {
  title: '',
  type: 'visited', // 默认值设为 'diary'，与你的类型定义匹配
  location: '',
  coordinates: null,
  dateStart: '',
  dateEnd: '',
  transportation: '',
  content: '', // 你的类型定义中 content 可以为 null
  photos: [],
};

export const useFormData = (initialData?: Partial<FormData>) => {
  // 初始化 state，只在首次渲染时合并 initialData
  const [formData, setFormDataState] = useState<FormData>({
    ...initialFormData,
    ...initialData,
  });

  // 你的代码中使用了 formDataRef，我们保留它
  // 它的作用是在 useCallback 的闭包函数中访问到最新的 formData 值
  const formDataRef = useRef(formData);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  // 【关键修复】使用 useCallback 包装所有返回的函数
  // 这样它们的引用就不会在每次渲染时都改变

  // 用于完全替换 formData 对象，例如在编辑模式下填充表单数据
  const setFormData = useCallback((data: FormData) => {
    setFormDataState(data);
  }, []); // 空依赖数组 [] 保证函数引用永远稳定

  // 用于更新 formData 对象的部分字段
  const updateFormData = useCallback((updates: Partial<FormData>) => {
    setFormDataState(prev => ({ ...prev, ...updates }));
  }, []);

  // 用于更新单个字段
  const updateField = useCallback(<K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormDataState(prev => ({ ...prev, [field]: value }));
  }, []);

  // 添加新照片
  const addPhotos = useCallback((newPhotos: File[]) => {
    console.log('添加照片', newPhotos.length);
    const photoObjects = newPhotos.map(file => ({
      file,
      url: URL.createObjectURL(file),
      status: 'pending' as UploadStatus,
      cloudinary: undefined, // 显式定义，保证对象结构一致
      error: undefined,      // 显式定义
    }));

    setFormDataState(prev => ({
      ...prev,
      photos: [...prev.photos, ...photoObjects],
    }));
  }, []);

  // 移除指定索引的照片
  const removePhoto = useCallback((index: number) => {
    setFormDataState(prev => {
      const photoToRemove = prev.photos[index];
      // 清理预览URL，防止内存泄漏
      if (photoToRemove && photoToRemove.url && photoToRemove.file) {
        URL.revokeObjectURL(photoToRemove.url);
      }
      return {
        ...prev,
        photos: prev.photos.filter((_, i) => i !== index),
      };
    });
  }, []);

  // 通过文件对象更新照片状态
  const updatePhotoStatusByFile = useCallback((
    file: File,
    status: UploadStatus,
    cloudinary?: CloudinaryPhotoInfo,
    error?: string
  ) => {
    console.log('通过文件更新照片状态:', { fileName: file.name, status });
    setFormDataState(prev => ({
      ...prev,
      photos: prev.photos.map(photo =>
        // 确保 photo.file 存在再进行比较
        (photo.file && photo.file === file)
          ? { ...photo, status, cloudinary, error }
          : photo
      ),
    }));
  }, []);

  // 通过索引更新照片状态
  const updatePhotoStatusByIndex = useCallback((
    index: number,
    status: UploadStatus,
    cloudinary?: CloudinaryPhotoInfo,
    error?: string
  ) => {
    console.log('通过索引更新照片状态:', { index, status });
    setFormDataState(prev => {
      if (index < 0 || index >= prev.photos.length) {
        console.warn('照片索引超出范围:', index);
        return prev;
      }
      const newPhotos = [...prev.photos];
      newPhotos[index] = { ...newPhotos[index], status, cloudinary, error };
      return { ...prev, photos: newPhotos };
    });
  }, []);

  // 对照片进行排序
  const sortPhotos = useCallback((fromIndex: number, toIndex: number) => {
    setFormDataState(prev => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= prev.photos.length ||
        toIndex >= prev.photos.length
      ) {
        return prev;
      }
      const newPhotos = [...prev.photos];
      const [movedPhoto] = newPhotos.splice(fromIndex, 1);
      newPhotos.splice(toIndex, 0, movedPhoto);
      return { ...prev, photos: newPhotos };
    });
  }, []);

  // 重试所有上传失败的照片
  const retryFailedPhotos = useCallback(() => {
    console.log('重试所有失败的照片');
    setFormDataState(prev => ({
      ...prev,
      photos: prev.photos.map(photo =>
        photo.status === 'error'
          ? { ...photo, status: 'pending', error: undefined }
          : photo
      ),
    }));
  }, []);

  // 通过索引重试单张照片
  const retryPhotoByIndex = useCallback((index: number) => {
    console.log('重试指定照片，索引:', index);
    setFormDataState(prev => {
      if (index < 0 || index >= prev.photos.length) {
        console.warn('照片索引超出范围:', index);
        return prev;
      }
      const newPhotos = [...prev.photos];
      const photo = newPhotos[index];
      if (photo.status === 'error') {
        newPhotos[index] = { ...photo, status: 'pending', error: undefined };
      }
      return { ...prev, photos: newPhotos };
    });
  }, []);

  // 通过文件对象重试单张照片
  const retryPhotoByFile = useCallback((file: File) => {
    console.log('重试指定文件:', file.name);
    setFormDataState(prev => ({
      ...prev,
      photos: prev.photos.map(photo =>
        (photo.file && photo.file === file && photo.status === 'error')
          ? { ...photo, status: 'pending', error: undefined }
          : photo
      ),
    }));
  }, []);

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
  };
};
