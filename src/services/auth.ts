import type { Session, User } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/services/supabase'

export type { Session, User }

/**
 * 面向 UI 的鉴权错误。
 *
 * message 对用户可理解，不暴露 Supabase 内部错误细节，也不包含任何凭据。
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthError'
  }
}

function toAuthErrorMessage(message: string): string {
  if (message.includes('Invalid login credentials')) {
    return '邮箱或密码不正确，请重试。'
  }

  if (message.includes('Email not confirmed')) {
    return '邮箱尚未完成验证，请先完成邮箱验证。'
  }

  return '登录失败，请稍后重试。'
}

/**
 * 邮箱 + 密码登录。
 *
 * 成功后返回当前 session；失败时抛出 AuthError。
 * 注意：这里不打印 error、session、token，避免凭据进入日志。
 */
export async function signIn(email: string, password: string): Promise<Session> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new AuthError(toAuthErrorMessage(error.message))
  }

  if (!data.session) {
    throw new AuthError('登录失败，请稍后重试。')
  }

  return data.session
}

/** 退出登录。session 清理由 Supabase SDK 自行处理，不手工操作 storage。 */
export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    throw new AuthError('退出登录失败，请稍后重试。')
  }
}

/** 获取当前 session（Supabase SDK 负责持久化与刷新）。 */
export async function getSession(): Promise<Session | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.auth.getSession()

  if (error) {
    throw new AuthError('获取登录状态失败，请刷新页面重试。')
  }

  return data.session
}

/** 当前登录用户。 */
export async function getUser(): Promise<User | null> {
  const session = await getSession()
  return session?.user ?? null
}

/**
 * 订阅登录状态变化。
 *
 * 返回值是取消订阅函数，调用方在 effect cleanup 里执行。
 */
export function onAuthStateChange(
  listener: (session: Session | null) => void,
): () => void {
  const supabase = getSupabaseClient()

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    listener(session)
  })

  return () => {
    data.subscription.unsubscribe()
  }
}
