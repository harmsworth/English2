/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase 项目 URL */
  readonly VITE_SUPABASE_URL: string
  /** Supabase publishable key，只允许这一类 key 出现在前端 */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string
  /** 本地开发用登录邮箱，仅 dev 读取，禁止硬编码与提交 */
  readonly VITE_DEV_LOGIN_EMAIL: string
  /** 本地开发用登录密码，仅 dev 读取，禁止硬编码与提交 */
  readonly VITE_DEV_LOGIN_PASSWORD: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
