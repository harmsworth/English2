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
