/// <reference types="vite/client" />

interface ImportMetaEnv {
  // 在这里定义你的环境变量类型
  readonly VITE_GOOGLE_MAPS_KEY: string
  readonly VITE_CLOUDINARY_CLOUD_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}