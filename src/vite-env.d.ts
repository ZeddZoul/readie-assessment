/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_MODE?: string;
  readonly VITE_API_BASE_PATH?: string;
  readonly VITE_API_CREDENTIALS?: string;
  readonly VITE_CAMPAIGNS?: string;
  readonly VITE_API_AUTH_KEY?: string;
  readonly VITE_API_BASIC_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
