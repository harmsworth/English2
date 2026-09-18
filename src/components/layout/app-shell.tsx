import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { History, House, LibraryBig, NotebookPen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

/**
 * 全局外壳（design-system §8.12 TopBar / §8.13 BottomTabBar）。
 *
 * 之前路由直接铺页面，每个页面各自渲染「← 返回首页」这类链接，导航方式不统一；
 * 这里收敛为：桌面顶栏 + 移动底部标签栏，页面只负责内容。
 *
 * ⚠️ 只承载导航与登出，**不碰任何业务数据**；数据链路仍是 Page → Hook → Service。
 */

/** 检索类页面（列表 / 详情 / 结果）：桌面 1280，留白 80；移动留白 20。 */
export const BROWSE_CONTAINER = 'mx-auto w-full max-w-[1280px] px-5 md:px-20'

/** 阅读区（题干 / 篇章 / 解析）：刻意保持 720–768，长行可读性优先，不随检索页加宽。 */
export const READING_CONTAINER = 'mx-auto w-full max-w-3xl px-5'

const NAV_ITEMS = [
  { to: '/', label: '首页', icon: House },
  { to: '/exams', label: '题库', icon: LibraryBig },
  // 练习记录：未完成练习 + 正确率统计 + 历史（整卷 / 题型分栏）
  { to: '/records', label: '记录', icon: History },
  { to: '/mistakes', label: '错题本', icon: NotebookPen },
] as const

function Wordmark() {
  return (
    <NavLink
      to="/"
      className="flex items-center gap-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <span className="font-heading text-[21px] leading-none font-bold text-[#17332F]">
        English2
      </span>
      <span className="rounded-[4px] bg-primary-soft px-1.5 py-0.5 text-[8px] leading-none font-bold tracking-[1.2px] text-primary">
        EXAM ARCHIVE
      </span>
    </NavLink>
  )
}

function Avatar({ email }: { email: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-7 items-center justify-center rounded-full bg-primary-soft text-[10px] font-bold text-primary"
    >
      {email.slice(0, 1).toUpperCase()}
    </span>
  )
}

function TopBar() {
  const { user, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card">
      <div className="mx-auto flex h-14 w-full max-w-[1280px] items-center gap-4 px-5 md:px-20">
        <Wordmark />

        {/* 桌面：横向导航（当前项主色 + 底部指示条，压在页头下边框上） */}
        <nav
          aria-label="主导航"
          className="ml-4 hidden flex-1 items-center gap-1 md:flex"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'relative px-3 py-4 text-[13px] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive ? (
                    <span className="absolute inset-x-2 bottom-0 h-[2.5px] rounded-full bg-primary" />
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-[13px] text-muted-foreground sm:inline">
            {user?.email ?? '未知用户'}
          </span>
          <Avatar email={user?.email ?? '?'} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              void signOut()
            }}
          >
            退出
          </Button>
        </div>
      </div>
    </header>
  )
}

function BottomTabBar() {
  return (
    <nav
      aria-label="底部导航"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="flex list-none">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.to} className="flex-1">
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'relative flex h-14 flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive ? (
                      <span className="absolute inset-x-6 top-0 h-[2.5px] rounded-full bg-primary" />
                    ) : null}
                    <Icon aria-hidden="true" className="size-4" strokeWidth={1.5} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function AppShell() {
  const { pathname } = useLocation()
  // 答题页是沉浸任务页，自带 sticky 底部操作条 —— 再叠一层全局标签栏会互相打架。
  // 按路径分段判断，三类答题路由都要命中：
  //   `/exams/:paperId/practice`（整卷）、`.../practice/:sectionId`（单篇）、
  //   `/drill/:sessionId`（题型练习）。
  // 用 includes('/practice/') 会漏掉不带尾斜杠的整卷路由，故按分段取词。
  const segments = pathname.split('/')
  const hideBottomBar = segments.includes('practice') || segments.includes('drill')

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <TopBar />
      {/* 移动端给底部标签栏留出空间，避免内容被压住 */}
      <div className={cn('flex-1', hideBottomBar ? '' : 'pb-20 md:pb-0')}>
        <Outlet />
      </div>
      {hideBottomBar ? null : <BottomTabBar />}
    </div>
  )
}
