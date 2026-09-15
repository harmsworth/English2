import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** 环境变量是否配置完整。UI 可以据此提示去设置页填写。 */
export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl && supabasePublishableKey,
)

let cachedClient: SupabaseClient | null = null

/**
 * 获取 Supabase 客户端（懒加载单例）。
 *
 * 只允许使用 publishable key，service role / 数据库密码 / GitHub Token
 * 一律不允许进入前端。
 */
export function getSupabaseClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient
  }

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      '尚未配置 Supabase 环境变量，请在 .env.local 中填写 VITE_SUPABASE_URL 与 VITE_SUPABASE_PUBLISHABLE_KEY。',
    )
  }

  cachedClient = createClient(supabaseUrl, supabasePublishableKey)
  return cachedClient
}
