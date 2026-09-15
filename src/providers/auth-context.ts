import { createContext } from 'react'
import type { Session, User } from '@/services/auth'

export interface AuthContextValue {
  /** 当前 session；未登录为 null */
  session: Session | null
  /** 当前用户；未登录为 null */
  user: User | null
  /** 首次读取 session 期间为 true，用于避免路由保护误判 */
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
