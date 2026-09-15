import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
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
