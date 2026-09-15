import { useQuery } from '@tanstack/react-query'
import { examKeys } from '@/lib/constants'
import { getCurrentExamPapers } from '@/services/exams'

/**
 * 当前版本试卷列表。
 *
 * 只负责 React Query 状态，数据访问一律走 exams service。
 */
export function useExamPapers() {
  return useQuery({
    queryKey: examKeys.lists(),
    queryFn: getCurrentExamPapers,
  })
}
