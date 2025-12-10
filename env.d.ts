/// <reference types="vite/client" />

interface ImportMetaEnv {
  // 在这里定义你的环境变量类型
  readonly VITE_GOOGLE_MAPS_KEY: string
  // 可以继续添加其他以 VITE_ 开头的变量...
  // readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}