import { useQuery } from '@tanstack/react-query'
import { examKeys } from '@/lib/constants'
import {
  getSectionsByTypeAndYears,
  type ExamSectionWithYear,
} from '@/services/exams'

/**
 * 题型练习的数据源：按「题型 + 年份集合」取所有同类大题。
 *
 * 只做 React Query 状态管理；查询细节与排序契约全在 service 层。
 * 年份为空时禁用查询（没有年份就没有题目可练）。
 */
export function useSectionsByTypeAndYears(
  type: string | null,
  years: readonly number[],
) {
  const enabled = Boolean(type) && years.length > 0
  return useQuery<ExamSectionWithYear[]>({
    queryKey: examKeys.drill(type ?? '__none__', years),
    enabled,
    queryFn: async () =>
      type ? await getSectionsByTypeAndYears(type, [...years]) : [],
  })
}
