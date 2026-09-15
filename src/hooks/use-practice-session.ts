import { useQuery } from '@tanstack/react-query'
import { practiceKeys } from '@/lib/constants'
import {
  getPracticeAnswers,
  getPracticeSessionById,
  getResumablePracticeSession,
  type PracticeTarget,
} from '@/services/practice'

/**
 * 读取当前用户的某个练习会话。
 *
 * 只管 React Query 状态；数据访问一律走 practice service，Hook 不碰 Supabase。
 */
export function usePracticeSession(id: string | undefined) {
  return useQuery({
    queryKey: practiceKeys.session(id ?? '__none__'),
    enabled: Boolean(id),
    queryFn: async () => (id ? await getPracticeSessionById(id) : null),
  })
}

/**
 * 查找可恢复（active / paused）会话，供进入练习时决定「继续 / 重新开始」。
 * 返回的是符合条件中最新的一条（数据库不保证“唯一 active”，见 service 注释）。
 */
export function useResumablePracticeSession(target: PracticeTarget) {
  return useQuery({
    queryKey: practiceKeys.resumable(
      target.sessionType,
      target.sectionId ?? null,
      target.paperId ?? null,
    ),
    queryFn: () => getResumablePracticeSession(target),
  })
}

/**
 * 读取某会话已保存的作答，用于刷新 / 重进后恢复选项高亮（parse5b §13）。
 * 会话确定后才启用；返回安全 DTO（不含判分列）。
 */
export function usePracticeAnswers(sessionId: string | undefined) {
  return useQuery({
    queryKey: sessionId
      ? practiceKeys.answers(sessionId)
      : [...practiceKeys.all, 'answers', '__none__'],
    enabled: Boolean(sessionId),
    queryFn: async () =>
      sessionId ? await getPracticeAnswers(sessionId) : [],
  })
}
