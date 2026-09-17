/**
 * 全局常量。
 *
 * 注意：题库源数据 `data/exams/` 只用于同步 / 校验 / 审计（经 `sync_exam_paper`
 * 写入 Supabase）；运行时前端一律从 Supabase 读取，不再通过 GitHub Raw 拉取，
 * 因此这里不再维护题库文件清单。
 */

/** TanStack Query 的 query key 统一入口，避免页面里到处手写字符串 */
export const examKeys = {
  all: ['exams'] as const,
  lists: () => [...examKeys.all, 'list'] as const,
  detail: (paperId: string) => [...examKeys.all, 'detail', paperId] as const,
}

/**
 * Practice（练习会话 / 答题）query key 工厂，沿用 examKeys 的集中约定。
 * 只包含 Phase 5A/5B 实际用到的键；未来的错题 / 统计等按需再加，不预先造。
 */
export const practiceKeys = {
  all: ['practice'] as const,
  session: (id: string) => [...practiceKeys.all, 'session', id] as const,
  answers: (sessionId: string) =>
    [...practiceKeys.all, 'answers', sessionId] as const,
  resumable: (
    sessionType: string,
    sectionId: string | null,
    paperId: string | null,
  ) =>
    [
      ...practiceKeys.all,
      'resumable',
      sessionType,
      sectionId ?? '',
      paperId ?? '',
    ] as const,
}

/**
 * 错题本（mistakes）query key 工厂。
 * 列表以当前用户为界（RLS 已限本人），故不需要把 user id 拼进 key。
 */
export const mistakeKeys = {
  all: ['mistakes'] as const,
  list: () => [...mistakeKeys.all, 'list'] as const,
}
