import { createBrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '@/components/protected-route'
import ExamDetailPage from '@/pages/ExamDetailPage'
import ExamListPage from '@/pages/ExamListPage'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import NotFoundPage from '@/pages/NotFoundPage'

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    // 需要登录后才能访问的应用路由
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <HomePage />,
      },
      {
        path: '/exams',
        element: <ExamListPage />,
      },
      {
        // 用试卷 id 定位，避免将来多版本共存的年份撞车
        path: '/exams/:paperId',
        element: <ExamDetailPage />,
      },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
])
