/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase 项目 URL */
  readonly VITE_SUPABASE_URL: string
  /** Supabase publishable key，只允许这一类 key 出现在前端 */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
