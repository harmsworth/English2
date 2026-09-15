import { useQuery } from '@tanstack/react-query'
import { examKeys } from '@/lib/constants'
import { getExamPaperById } from '@/services/exams'

/**
 * 单个试卷的完整详情（paper → sections → items → options）。
 *
 * 只负责 React Query 状态，数据访问一律走 exams service。
 *
 * `paperId` 可能来自路由参数而暂时为空：此时用 `enabled` 关掉请求，
 * 避免发出 `exam_papers?id=eq.undefined` 这类无意义查询。
 * query key 沿用既有的 `examKeys.detail`，缺失时以空字符串占位。
 */
export function useExamPaper(paperId: string | undefined) {
  return useQuery({
    queryKey: examKeys.detail(paperId ?? ''),
    queryFn: () => (paperId ? getExamPaperById(paperId) : null),
    enabled: Boolean(paperId),
  })
}
