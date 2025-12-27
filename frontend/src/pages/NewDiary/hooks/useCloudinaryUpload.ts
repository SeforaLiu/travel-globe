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

// 修改回调类型：移除 uploading 状态，只处理最终状态
type UploadProgressCallback = (
  index: number,
  status: 'success' | 'error',  // 只保留最终状态
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
        reject(new Error(t('Network error') || 'Network error'));
      };

      xhr.send(formData);
    });
  }, [enhancedValidateFile, t]);

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
      // Step 1: 只处理需要上传的照片（pending 或 error 状态）
      const photosToUpload = photos.filter(photo =>
        photo.status === 'pending' || photo.status === 'error'
      );

      if (photosToUpload.length === 0) {
        console.log('没有需要上传的照片');
        return results;
      }

      console.log('开始上传照片，数量:', photosToUpload.length, {
        pending: photosToUpload.filter(p => p.status === 'pending').length,
        error: photosToUpload.filter(p => p.status === 'error').length
      });

      // Step 2: 去重处理
      const uniquePhotos: QueuedPhoto[] = [];
      const processedSignatures = new Set<string>();

      photosToUpload.forEach((photo, index) => {
        const signature = generateFileSignature(photo.file);

        if (processedSignatures.has(signature)) {
          if (uploadedFiles[signature]) {
            // 通知成功状态
            onProgress(index, 'success', uploadedFiles[signature]);
            results.push(uploadedFiles[signature]);
            console.log(`"${photo.file.name}" 已存在，使用缓存结果`);
          }
          return;
        }

        processedSignatures.add(signature);
        uniquePhotos.push({
          ...photo,
          originalIndex: index
        });
      });

      if (uniquePhotos.length === 0) {
        console.log('所有照片都已处理完成');
        return results;
      }

      // Step 3: 准备上传任务队列
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
          // 检查缓存
          if (uploadedFiles[signature]) {
            const cachedResult = uploadedFiles[signature];
            onProgress(originalIndex, 'success', cachedResult);
            return cachedResult;
          }

          // 文件预处理
          const processedFile = await processFile(file);

          // 执行上传
          const result = await uploadToCloudinary(processedFile, controller.signal);

          // 更新缓存
          setUploadedFiles(prev => ({
            ...prev,
            [signature]: result
          }));

          onProgress(originalIndex, 'success', result);
          console.log('上传照片成功:', result.originalFilename);
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : '未知错误';

          if (errorMessage !== '上传已取消') {
            // 通知错误状态
            onProgress(originalIndex, 'error', undefined, errorMessage);

            // 根据错误类型显示不同提示
            if (errorMessage.includes('Network error') || errorMessage.includes('网络')) {
              console.error(`网络错误: "${file.name}"`);
            } else {
              console.error(`"${file.name}" 上传失败: ${errorMessage}`);
            }
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

      // Step 4: 并发执行上传
      const workers = Array.from({ length: MAX_CONCURRENT_UPLOADS }).map(async () => {
        while (uploadPromises.length > 0) {
          // 检查全局取消信号
          if (signal?.aborted) {
            throw new Error('上传已取消');
          }
          const task = uploadPromises.shift();
          if (task) {
            try {
              const result = await task();
              if (result) results.push(result);
            } catch (error) {
              // 单个任务失败不影响其他任务
              console.error('单个文件上传失败:', error);
            }
          }
        }
      });

      await Promise.all(workers);

      console.log(`上传完成，成功数量: ${results.length}，耗时 ${((performance.now() - uploadStartTime) / 1000).toFixed(2)}秒`);

      return results;
    } catch (error) {
      console.error('上传过程中出现全局错误:', error);
      throw error;
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

  // 清除指定文件的缓存（用于重试）
  const clearFileCache = useCallback((file: File) => {
    const signature = generateFileSignature(file);
    setUploadedFiles(prev => {
      const newFiles = { ...prev };
      delete newFiles[signature];
      return newFiles;
    });
  }, []);

  return {
    uploading,
    uploadPhotos,
    cancelUploads,
    uploadedFiles,
    setUploadedFiles,
    resetCache,
    clearFileCache
  };
};
