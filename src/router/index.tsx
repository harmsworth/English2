import { lazy, Suspense, type ReactElement } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '@/components/protected-route'
import { AppShell } from '@/components/layout/app-shell'
import NotFoundPage from '@/pages/NotFoundPage'

/**
 * F8：Route-level code splitting。
 *
 * 页面组件改为按路由懒加载，使其各自进入独立的 route chunk，缩小首屏 initial bundle。
 * 保持同步加载的只有：路由外壳、鉴权 gate（ProtectedRoute）、兜底页（NotFoundPage）——
 * 这几处必须留在首包，才能在懒加载失败/未鉴权时也正常兜底。
 *
 * 注意：懒加载只改变“加载策略”，不改变任何 route 行为；
 * 数据链路仍是 Page → Hook → Service → Supabase，router 层不碰 Supabase / Query。
 */
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const HomePage = lazy(() => import('@/pages/HomePage'))
const ExamListPage = lazy(() => import('@/pages/ExamListPage'))
const ExamDetailPage = lazy(() => import('@/pages/ExamDetailPage'))
const ExamPracticePage = lazy(() => import('@/pages/ExamPracticePage'))
const PracticePage = lazy(() => import('@/pages/PracticePage'))
const DrillPage = lazy(() => import('@/pages/DrillPage'))
const RecordsPage = lazy(() => import('@/pages/RecordsPage'))
const MistakesPage = lazy(() => import('@/pages/MistakesPage'))

/** lazy chunk 加载期间的最小占位，复用 ProtectedRoute 的居中 muted 文案风格，不做新视觉设计。 */
function RouteFallback() {
  return (
    <main className="flex min-h-svh items-center justify-center px-5">
      <p className="text-sm text-muted-foreground">页面加载中…</p>
    </main>
  )
}

/** 用一个共享 Suspense 包住懒加载页面，避免每条路由重复书写。 */
function lazyPage(element: ReactElement) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: lazyPage(<LoginPage />),
  },
  {
    // 需要登录后才能访问的应用路由
    element: <ProtectedRoute />,
    children: [
      {
        // 共享外壳（顶栏 + 移动底部标签栏）：页面只负责内容，不再各自写返回链接。
        // 注意：这里不是懒加载 —— 外壳必须在首包，否则每个页面首帧都会闪一下无导航的空白。
        element: <AppShell />,
        children: [
          {
            path: '/',
            element: lazyPage(<HomePage />),
          },
          {
            path: '/exams',
            element: lazyPage(<ExamListPage />),
          },
          {
            // 用试卷 id 定位，避免将来多版本共存的年份撞车
            path: '/exams/:paperId',
            element: lazyPage(<ExamDetailPage />),
          },
          {
            // 整卷练习：一个会话覆盖全卷 9 个大题（session_type='exam'，绑 paper）
            path: '/exams/:paperId/practice',
            element: lazyPage(<ExamPracticePage />),
          },
          {
            // 大题练习：按大题（sectionId）练习，会话绑 section；保留给定向练习用
            path: '/exams/:paperId/practice/:sectionId',
            element: lazyPage(<PracticePage />),
          },
          {
            // 题型练习：把同一题型跨年份的大题整合成一次练习（会话绑 drill_type + drill_years）。
            // 选题在题库页（/exams?tab=drill）完成，这里只按会话 id 恢复与作答。
            path: '/drill/:sessionId',
            element: lazyPage(<DrillPage />),
          },
          {
            // 练习记录：未完成练习 + 正确率统计 + 整卷 / 题型分栏历史
            path: '/records',
            element: lazyPage(<RecordsPage />),
          },
          {
            // 错题本（Phase 7）：列表 / 标记已掌握 / 移出，全部限本人
            path: '/mistakes',
            element: lazyPage(<MistakesPage />),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
