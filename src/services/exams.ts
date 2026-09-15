import { getSupabaseClient } from '@/services/supabase'
import type { Tables } from '@/types/database'

/**
 * 题库读取 Service。
 *
 * 本层是唯一允许访问 Supabase 的地方：
 * Hook → Service → Supabase，页面与 Hook 都不得直接 `supabase.from(...)`。
 */

/**
 * 当前版本试卷列表。
 *
 * 过滤 is_current = true，按 year 倒序。
 */
export async function getCurrentExamPapers(): Promise<
  Tables<'exam_papers'>[]
> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('exam_papers')
    .select('*')
    .eq('is_current', true)
    .order('year', { ascending: false })

  if (error) {
    throw error
  }

  return data
}

/**
 * 单个试卷（仅 exam_papers 层面）。
 *
 * 完整 paper → sections → items → options 聚合读取属于后续真题 / 练习阶段。
 */
export async function getExamPaperById(
  paperId: string,
): Promise<Tables<'exam_papers'> | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('exam_papers')
    .select('*')
    .eq('id', paperId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}
