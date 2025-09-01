/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly NODE_ENV: string
  // Añadir más variables VITE_ si las necesitas
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
