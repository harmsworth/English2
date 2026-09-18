import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AuthContext } from '@/providers/auth-context'
import type { AuthContextValue } from '@/providers/auth-context'
import {
  getSession,
  onAuthStateChange,
  signIn as signInRequest,
  signOut as signOutRequest,
} from '@/services/auth'
import type { Session } from '@/services/auth'

/**
 * 最小 AuthProvider。
 *
 * 只维护 session / user / isLoading 三份状态，以及 signIn / signOut 两个动作。
 * 真正的 Supabase Auth 调用全部在 auth service 里，Provider 不直接碰 client。
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const queryClient = useQueryClient()
  /** 上一次生效的身份（user id）。null 表示「还没有过身份」，与「已登出」不是一回事。 */
  const identityRef = useRef<string | null>(null)

  /**
   * ⚠️ **身份变更 = 缓存边界**，必须清 React Query 缓存。
   *
   * 为什么非清不可：全局 `staleTime` 是 5 分钟（`src/main.tsx`）。上一个身份留下的
   * 练习记录 / 统计在一个新身份下仍然「新鲜」，React Query 的 `refetchOnMount`
   * 默认只在 stale 时才重取 —— 于是**登出再登录另一个账号后，页面继续展示上一个
   * 身份的空数据**（用户视角就是「明明练过，登录后记录都没了」），要等 5 分钟过期
   * 或手动刷新才恢复。这同时也是跨身份的**数据泄漏**：A 的记录会被 B 看到。
   *
   * 只在**身份真的变了**时清：`TOKEN_REFRESHED`（同一个人续期）不能清，
   * 否则每次自动续期都会把整站缓存打掉、所有页面重新请求一遍。
   * 首次建立身份（null → 某个 id）也不清 —— 那时缓存本来就是空的。
   */
  useEffect(() => {
    const nextIdentity = session?.user?.id ?? null
    if (identityRef.current !== null && identityRef.current !== nextIdentity) {
      queryClient.clear()
    }
    identityRef.current = nextIdentity
  }, [session, queryClient])

  useEffect(() => {
    let active = true

    getSession()
      .then((current) => {
        if (active) {
          setSession(current)
        }
      })
      .catch(() => {
        if (active) {
          setSession(null)
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false)
        }
      })

    const unsubscribe = onAuthStateChange((next) => {
      setSession(next)
    })

    return () => {
      active = false
      unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await signInRequest(email, password)
    setSession(next)
  }, [])

  const signOut = useCallback(async () => {
    await signOutRequest()
    setSession(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      signIn,
      signOut,
    }),
    [session, isLoading, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
