import { useQuery } from '@tanstack/react-query'
import { examKeys } from '@/lib/constants'
import { getExamPaperById } from '@/services/exams'

/**
 * 单个试卷。
 *
 * 只负责 React Query 状态，数据访问一律走 exams service。
 */
export function useExamPaper(paperId: string) {
  return useQuery({
    queryKey: examKeys.detail(paperId),
    queryFn: () => getExamPaperById(paperId),
  })
}
