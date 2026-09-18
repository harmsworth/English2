import { useQuery } from '@tanstack/react-query'
import { practiceKeys } from '@/lib/constants'
import {
  getIncompletePracticeSessions,
  getPracticeAnswers,
  getPracticeSessionById,
  getPracticeSessionStats,
  getPracticeTypeAccuracy,
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
export function useResumablePracticeSession(
  target: PracticeTarget,
  enabled = true,
) {
  const drillYears = target.drillYears ?? null
  return useQuery({
    queryKey: practiceKeys.resumable(
      target.sessionType,
      target.sectionId ?? null,
      target.paperId ?? null,
      drillYears ? `${target.drillType ?? ''}#${[...drillYears].sort((a, b) => a - b).join(',')}` : '',
    ),
    // ⚠️ 必须显式启用：target 里定位字段缺失时 service 不会加对应过滤，
    // 若不禁用就会匹配到「任意」同类型会话（拿到别人的练习进度）。
    enabled:
      enabled &&
      (Boolean(target.sectionId) ||
        Boolean(target.paperId) ||
        (Boolean(target.drillType) && drillYears !== null && drillYears.length > 0)),
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

/**
 * 未完成（active / paused）的练习会话。首页「未完成的练习」与记录页顶部共用。
 * 数据源是 `practice_sessions` 本身（不含答案列，RLS 限本人），不需要 RPC。
 */
export function useIncompletePracticeSessions() {
  return useQuery({
    queryKey: practiceKeys.incomplete(),
    queryFn: () => getIncompletePracticeSessions(),
  })
}

/**
 * 练习记录（每会话聚合：用时 + 已判分题数 + 正确数）。
 *
 * ⚠️ 走 `practice_session_stats` RPC：`practice_answers.is_correct` 已被列级 REVOKE，
 * 前端读不到，无法自己算分。该 RPC 只回**计数**，不回题目级答案。
 */
export function usePracticeSessionStats() {
  return useQuery({
    queryKey: practiceKeys.stats(),
    queryFn: () => getPracticeSessionStats(),
  })
}

/** 各题型正确率汇总（记录页图表）。同样是只回计数的聚合 RPC。 */
export function usePracticeTypeAccuracy() {
  return useQuery({
    queryKey: practiceKeys.typeAccuracy(),
    queryFn: () => getPracticeTypeAccuracy(),
  })
}
