import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'

export default function HomePage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col justify-center px-5 py-16">
      <p className="text-sm font-medium tracking-wide text-muted-foreground">
        考研英语二 · 真题学习
      </p>

      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
        英语真题
      </h1>

      <p className="mt-4 text-lg leading-8 text-muted-foreground">
        每天进步一点。
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <Button type="button">开始学习</Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void navigate('/exams')
          }}
        >
          查看历年真题
        </Button>
      </div>

      <p className="mt-12 text-sm text-muted-foreground">项目初始化成功。</p>

      {/* 最小 logout 入口，Phase 3 只提供退出登录能力 */}
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t pt-6">
        <span className="text-sm text-muted-foreground">
          已登录：{user?.email ?? '未知用户'}
        </span>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void signOut()
          }}
        >
          退出登录
        </Button>
      </div>
    </main>
  )
}
