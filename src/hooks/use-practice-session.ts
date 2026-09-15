import { useQuery } from '@tanstack/react-query'
import { practiceKeys } from '@/lib/constants'
import {
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
