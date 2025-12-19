import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { cl } from '../../../services/cloudinary';
import { generateFileSignature, validateFile, processImage, convertHeicToJpeg } from '../../../utils/imageProcessor';
import { UploadStatus } from '../types';

type UploadResult = {
  publicId: string;
  url: string;
};

export const useCloudinaryUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadResult>>({});

  const uploadToCloudinary = useCallback(async (file: File): Promise<UploadResult> => {
    return new Promise((resolve, reject) => {
      // 验证文件
      const validation = validateFile(file);
      if (!validation.valid) {
        reject(new Error(validation.error));
        return;
      }

      // 创建FormData用于上传
      const formData = new FormData();
      formData.append('file', file);
      // @ts-ignore
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'default_preset');
      formData.append('quality', 'auto'); // 智能质量压缩

      const xhr = new XMLHttpRequest();
      // @ts-ignore
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cl.config().cloud_name}/image/upload`);

      xhr.onload = function () {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve({
            publicId: response.public_id,
            url: response.secure_url
          });
        } else {
          reject(new Error(`上传失败: ${xhr.statusText}`));
        }
      };

      xhr.onerror = function () {
        reject(new Error('网络错误'));
      };

      xhr.send(formData);
    });
  }, []);

  const uploadPhotos = useCallback(async (
    photos: Array<{ file: File; url?: string; status: UploadStatus }>,
    onProgress: (index: number, status: UploadStatus, result?: UploadResult, error?: string) => void
  ) => {
    setUploading(true);

    try {
      // 批量处理文件，减少重复上传
      const uniquePhotos: Array<{ file: File; url?: string; status: UploadStatus; originalIndex: number }> = [];
      const processedSignatures: string[] = [];

      // 去重逻辑
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const fileSignature = generateFileSignature(photo.file);

        // 检查是否已经处理过该文件
        if (processedSignatures.includes(fileSignature)) {
          // 如果已经上传过，找到之前的结果并复用
          const existingResult = uploadedFiles[fileSignature];
          if (existingResult) {
            onProgress(i, 'success', existingResult);
            toast.info(`文件 "${photo.file.name}" 已存在，使用缓存结果`);
          } else {
            // 如果有签名但没有结果，仍然添加到处理队列
            uniquePhotos.push({ ...photo, originalIndex: i });
            processedSignatures.push(fileSignature);
          }
        } else {
          uniquePhotos.push({ ...photo, originalIndex: i });
          processedSignatures.push(fileSignature);
        }
      }

      // 处理唯一的文件
      for (let i = 0; i < uniquePhotos.length; i++) {
        const photo = uniquePhotos[i];
        const fileSignature = generateFileSignature(photo.file);

        // 检查是否已经上传过（双重检查）
        if (uploadedFiles[fileSignature]) {
          onProgress(photo.originalIndex, 'success', uploadedFiles[fileSignature]);
          toast.info(`文件 "${photo.file.name}" 已存在，使用缓存结果`);
          continue;
        }

        try {
          onProgress(photo.originalIndex, 'uploading');

          let processedFile = photo.file;

          // 处理HEIC格式
          if (photo.file.type.toLowerCase().includes('heic')) {
            processedFile = await convertHeicToJpeg(photo.file);
          }

          // 处理图片（仅压缩，不改变尺寸和比例）
          processedFile = await processImage(processedFile);

          // 上传到Cloudinary
          const result = await uploadToCloudinary(processedFile);

          // 缓存上传结果用于去重
          setUploadedFiles(prev => ({
            ...prev,
            [fileSignature]: result
          }));

          onProgress(photo.originalIndex, 'success', result);
          toast.success(`"${photo.file.name}" 上传成功`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '未知错误';
          onProgress(photo.originalIndex, 'error', undefined, errorMessage);
          toast.error(`"${photo.file.name}" 上传失败: ${errorMessage}`);
        }
      }
    } finally {
      setUploading(false);
    }
  }, [uploadToCloudinary, uploadedFiles]);

  // 重置上传缓存
  const resetCache = useCallback(() => {
    setUploadedFiles({});
  }, []);

  return {
    uploading,
    uploadPhotos,
    uploadedFiles,
    setUploadedFiles,
    resetCache
  };
};
