import { MAX_FILE_SIZE } from '../services/cloudinary';

/**
 * 检查文件是否符合要求
 */
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  // 检查文件格式
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `不支持的文件格式: ${file.type}. 仅支持 JPG, JPEG, PNG, WebP${file.type.toLowerCase().includes('heic') ? ' 和 HEIC' : ''}`
    };
  }

  // 检查文件大小
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `文件大小超过限制 (${(MAX_FILE_SIZE / 1024 / 1024).toFixed(1)}MB)`
    };
  }

  return { valid: true };
};

/**
 * 处理HEIC格式转换
 */
export const convertHeicToJpeg = async (file: File): Promise<File> => {
  // 这里简化处理，实际项目中可能需要引入专门的HEIC转换库
  // 例如: heic2any 或 browser-image-compression
  console.warn('HEIC转换功能需要引入专门的转换库');
  return file;
};

/**
 * 压缩图片（保留原始尺寸和比例）
 */
export const processImage = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('无法创建canvas上下文'));
          return;
        }

        // 保持原始尺寸
        canvas.width = img.width;
        canvas.height = img.height;

        // 绘制图片并应用智能压缩
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const processedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(processedFile);
            } else {
              reject(new Error('图片处理失败'));
            }
          },
          'image/jpeg',
          0.8 // 质量压缩
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * 生成文件唯一标识（用于去重）
 */
export const generateFileSignature = (file: File): string => {
  return `${file.name}-${file.size}-${file.lastModified}`;
};
