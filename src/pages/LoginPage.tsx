import { useForm } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { isSupabaseConfigured } from '@/services/supabase'

interface LoginFormValues {
  email: string
  password: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginPage() {
  const { session, isLoading, signIn } = useAuth()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: import.meta.env.DEV ? import.meta.env.VITE_DEV_LOGIN_EMAIL : '',
      password: import.meta.env.DEV ? import.meta.env.VITE_DEV_LOGIN_PASSWORD : '',
    },
  })

  // 已登录用户不应停留在登录页
  if (!isLoading && session) {
    return <Navigate to="/" replace />
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      await signIn(values.email.trim(), values.password)
    } catch (error) {
      setError('root', {
        message:
          error instanceof Error ? error.message : '登录失败，请稍后重试。',
      })
    }
  })

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center px-5 py-16">
      <Card>
        <CardHeader>
          <CardTitle>考研英语二 · 真题学习</CardTitle>
          <CardDescription>请使用邮箱和密码登录。</CardDescription>
        </CardHeader>

        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
            <div className="flex flex-col gap-2">
              <label htmlFor="email" className="text-sm font-medium">
                邮箱
              </label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                aria-invalid={errors.email ? true : undefined}
                {...register('email', {
                  required: '请输入邮箱。',
                  pattern: {
                    value: EMAIL_PATTERN,
                    message: '邮箱格式不正确。',
                  },
                })}
              />
              {errors.email ? (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="password" className="text-sm font-medium">
                密码
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-invalid={errors.password ? true : undefined}
                {...register('password', {
                  required: '请输入密码。',
                })}
              />
              {errors.password ? (
                <p className="text-sm text-destructive">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            {errors.root ? (
              <p className="text-sm text-destructive">{errors.root.message}</p>
            ) : null}

            {isSupabaseConfigured ? null : (
              <p className="text-sm text-destructive">
                尚未配置 Supabase 环境变量，请检查 .env.local。
              </p>
            )}

            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? '登录中…' : '登录'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
