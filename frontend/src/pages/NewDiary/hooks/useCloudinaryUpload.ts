// frontend/src/pages/NewDiary/hooks/useCloudinaryUpload.ts
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import {useTranslation} from 'react-i18next';
import { cl } from '../../../services/cloudinary';
import { generateFileSignature, validateFile, processImage, convertHeicToJpeg } from '../../../utils/imageProcessor';
import { UploadStatus } from '../types';

// 配置常量
const MAX_CONCURRENT_UPLOADS = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
// @ts-ignore
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${cl.config().cloud_name}/image/upload`;

type UploadResult = {
  publicId: string;
  url: string;
  width: number;
  height: number;
  size: number;
  format: string;
  folder: string;
  originalFilename: string;
  created_at: string
};

type QueuedPhoto = {
  file: File;
  url?: string;
  status: UploadStatus;
  originalIndex: number;
};

// 改进：定义回调类型，只应该通知最终状态
type UploadProgressCallback = (
  index: number,
  status: 'uploading' | 'success' | 'error', // 去掉 pending，只在最终状态时通知
  result?: UploadResult,
  error?: string
) => void;

export const useCloudinaryUpload = () => {
  const {t} = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, UploadResult>>({});
  const [abortControllers, setAbortControllers] = useState<Record<string, AbortController>>({});

  const enhancedValidateFile = useCallback((file: File) => {
    // 先执行原始验证
    const originalValidation = validateFile(file);
    if (!originalValidation.valid) {
      return {
        valid: false,
        error: `文件大小超过限制 (最大 ${MAX_FILE_SIZE / 1024 / 1024}MB)`
      };
    }

    return { valid: true };
  }, []);

  const uploadToCloudinary = useCallback(async (file: File, signal?: AbortSignal): Promise<UploadResult> => {
    return new Promise((resolve, reject) => {
      // 验证文件（包含大小检查）
      const validation = enhancedValidateFile(file);
      if (!validation.valid) {
        reject(new Error(validation.error));
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      // @ts-ignore
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'default_preset');
      formData.append('quality', 'auto');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', CLOUDINARY_UPLOAD_URL);

      // 取消支持
      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort();
          reject(new Error('上传已取消'));
        });
      }

      xhr.onload = function () {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve({
            publicId: response.public_id,
            url: response.secure_url,
            width: response.width,
            height: response.height,
            size: response.bytes,
            format: response.format,
            folder: response.folder,
            originalFilename: response.original_filename,
            created_at: response.created_at
          });
        } else {
          reject(new Error(`上传失败: ${xhr.statusText}`));
        }
      };

      xhr.onerror = function () {
        toast.error(t('Network error'))
      };

      xhr.send(formData);
    });
  }, [enhancedValidateFile]);

  const processFile = async (file: File): Promise<File> => {
    let processedFile = file;

    if (file.type.toLowerCase().includes('heic')) {
      processedFile = await convertHeicToJpeg(file);
    }

    return await processImage(processedFile);
  };

  const uploadPhotos = useCallback(async (
    photos: Array<{ file: File; url?: string; status: UploadStatus }>,
    onProgress: UploadProgressCallback,
    signal?: AbortSignal
  ): Promise<UploadResult[]> => {
    // 检查全局取消信号
    if (signal?.aborted) {
      throw new Error('上传已取消');
    }

    setUploading(true);
    const uploadStartTime = performance.now();
    const results: UploadResult[] = [];

    try {
      // Step 1: 去重处理
      const uniquePhotos: QueuedPhoto[] = [];
      const processedSignatures = new Set<string>();

      photos.forEach((photo, index) => {
        const signature = generateFileSignature(photo.file);

        if (processedSignatures.has(signature)) {
          if (uploadedFiles[signature]) {
            onProgress(index, 'success', uploadedFiles[signature]);
            results.push(uploadedFiles[signature]);
            toast.info(`"${photo.file.name}" 已存在，使用缓存结果`);
          }
          return;
        }

        processedSignatures.add(signature);
        uniquePhotos.push({
          ...photo,
          originalIndex: index
        });
      });

      // Step 2: 准备上传任务队列
      const uploadPromises = uniquePhotos.map(photo => async () => {
        const { file, originalIndex } = photo;
        const signature = generateFileSignature(file);

        // 检查全局取消信号
        if (signal?.aborted) {
          throw new Error('上传已取消');
        }

        // 为每个文件创建独立的AbortController
        const controller = new AbortController();
        setAbortControllers(prev => ({ ...prev, [signature]: controller }));

        try {
          // 再次检查缓存
          if (uploadedFiles[signature]) {
            const cachedResult = uploadedFiles[signature];
            onProgress(originalIndex, 'success', cachedResult);
            return cachedResult;
          }

          // **重要：不在上传开始时通知 uploading 状态**
          // onProgress(originalIndex, 'uploading');

          // 文件预处理
          const processedFile = await processFile(file);

          // 执行上传（传入取消信号）
          const result = await uploadToCloudinary(processedFile, controller.signal);

          // 更新缓存
          setUploadedFiles(prev => ({
            ...prev,
            [signature]: result
          }));

          // **只在成功完成时通知**
          onProgress(originalIndex, 'success', result);
          console.log('上传照片---result', result);
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '未知错误';

          // 如果不是用户取消的错误，显示提示
          if (errorMessage !== '上传已取消') {
            // **只在失败时通知 error 状态**
            onProgress(originalIndex, 'error', undefined, errorMessage);
            toast.error(`${t('Network error')} : "${file.name}" - ${errorMessage}`);
          }
          throw error;
        } finally {
          // 清理AbortController
          setAbortControllers(prev => {
            const newControllers = { ...prev };
            delete newControllers[signature];
            return newControllers;
          });
        }
      });

      // Step 3: 并发执行上传
      const workers = Array.from({ length: MAX_CONCURRENT_UPLOADS }).map(async () => {
        while (uploadPromises.length > 0) {
          // 检查全局取消信号
          if (signal?.aborted) {
            throw new Error('上传已取消');
          }
          const task = uploadPromises.shift();
          if (task) {
            const result = await task();
            if (result) results.push(result);
          }
        }
      });

      await Promise.all(workers);

      console.log(`上传完成，耗时 ${((performance.now() - uploadStartTime) / 1000).toFixed(2)}秒`);

      return results;
    } finally {
      setUploading(false);
    }
  }, [uploadToCloudinary, uploadedFiles, enhancedValidateFile]);

  // 取消所有上传
  const cancelUploads = useCallback(() => {
    Object.values(abortControllers).forEach(controller => {
      controller.abort();
    });
    setAbortControllers({});
    toast.warning('已取消所有上传');
  }, [abortControllers]);

  // 重置上传缓存
  const resetCache = useCallback(() => {
    setUploadedFiles({});
  }, []);

  return {
    uploading,
    uploadPhotos,
    cancelUploads,
    uploadedFiles,
    setUploadedFiles,
    resetCache
  };
};
