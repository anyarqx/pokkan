/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_ORIGIN?: string;
  readonly VITE_SUPPORT_URL?: string;
  readonly VITE_YOUTUBE_URL?: string;
  readonly VITE_GITHUB_URL?: string;
  readonly VITE_CREATOR_LABEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.yml" {
  const value: Record<string, unknown>;
  export default value;
}
