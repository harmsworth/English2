import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'

/**
 * 最小路由保护：只区分 authenticated / unauthenticated。
 *
 * 未登录 → /login
 * 已登录 → 正常渲染子路由
 */
export function ProtectedRoute() {
  const { session, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <main className="flex min-h-svh items-center justify-center px-5">
        <p className="text-sm text-muted-foreground">正在检查登录状态…</p>
      </main>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
