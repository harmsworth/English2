import { useContext } from 'react'
import { AuthContext } from '@/providers/auth-context'
import type { AuthContextValue } from '@/providers/auth-context'

/**
 * 读取当前登录状态。
 *
 * 页面与组件一律通过它拿 auth 状态，不得直接访问 Supabase client。
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth 必须在 AuthProvider 内部使用。')
  }

  return context
}
