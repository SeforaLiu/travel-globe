import { Cloudinary } from 'cloudinary-core';

// 初始化Cloudinary实例
export const cl = new Cloudinary({
  // @ts-ignore
  cloud_name: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,
  secure: true
});

// 允许的图片格式
export const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];

// 最大文件大小 (5MB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// 单次最多上传数量
export const MAX_PHOTOS = 10;
