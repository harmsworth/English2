import { getSupabaseClient } from '@/services/supabase'
import type { Tables } from '@/types/database'

/**
 * 题库读取 Service。
 *
 * 本层是唯一允许访问 Supabase 的地方：
 * Hook → Service → Supabase，页面与 Hook 都不得直接 `supabase.from(...)`。
 *
 * 数据库四层结构（见 src/types/database.ts 的真实外键）：
 * exam_papers.id → exam_sections.paper_id → section_items.section_id → item_options.item_id
 */

/** 一行试卷（exam_papers） */
export type ExamPaper = Tables<'exam_papers'>
/** 一行大题（exam_sections） */
export type ExamSection = Tables<'exam_sections'>
/** 一行小题（section_items） */
export type ExamItem = Tables<'section_items'>
/** 一行选项（item_options，无 is_correct 字段） */
export type ExamOption = Tables<'item_options'>

/**
 * 小题 + 它的选项。
 *
 * 只有 choice 类小题有选项；翻译 / 写作是 text 类，`options` 为空数组。
 * 正确选项下标保留在 `ExamItem['correct_option']`（0-based，与数据库一致，不做 +1 转换）。
 */
export type ExamItemWithOptions = ExamItem & { options: ExamOption[] }

/** 大题 + 它的小题 */
export type ExamSectionWithItems = ExamSection & { items: ExamItemWithOptions[] }

/** 试卷完整详情：paper → sections → items → options */
export type ExamPaperDetail = ExamPaper & { sections: ExamSectionWithItems[] }

/**
 * 一次性取回四层树状数据。
 *
 * 关系名来自 database.ts 的真实外键（exam_sections_paper_id_fkey /
 * section_items_section_id_fkey / item_options_item_id_fkey）。
 */
const PAPER_DETAIL_SELECT =
  '*, exam_sections(*, section_items(*, item_options(*)))' as const

/**
 * 把数据库返回的嵌套行整理成前端结构，并强制按字段排序。
 *
 * 服务端已通过 `referencedTable` 排序；这里再做一次确定性排序，
 * 保证「不依赖 PostgreSQL 默认返回顺序」这一契约无论如何都成立。
 */
function toExamPaperDetail(
  row: ExamPaper & {
    exam_sections: (ExamSection & {
      section_items: (ExamItem & { item_options: ExamOption[] })[]
    })[]
  },
): ExamPaperDetail {
  const { exam_sections: sections, ...paper } = row

  return {
    ...paper,
    sections: [...sections]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map(({ section_items: items, ...section }) => ({
        ...section,
        items: [...items]
          .sort((a, b) => a.item_no - b.item_no)
          .map(({ item_options: options, ...item }) => ({
            ...item,
            options: [...options].sort(
              (a, b) => a.option_index - b.option_index,
            ),
          })),
      })),
  }
}

/**
 * 当前版本试卷列表。
 *
 * 过滤 is_current = true，按 year 倒序。
 */
export async function getCurrentExamPapers(): Promise<ExamPaper[]> {
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
 * 单个试卷的完整详情：paper → sections → items → options。
 *
 * 排序契约：sections 按 sort_order、items 按 item_no、options 按 option_index，全部升序。
 * 试卷不存在时返回 null（与数据库错误区分：后者直接抛错）。
 */
export async function getExamPaperById(
  paperId: string,
): Promise<ExamPaperDetail | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('exam_papers')
    .select(PAPER_DETAIL_SELECT)
    .eq('id', paperId)
    .order('sort_order', { referencedTable: 'exam_sections', ascending: true })
    .order('item_no', {
      referencedTable: 'exam_sections.section_items',
      ascending: true,
    })
    .order('option_index', {
      referencedTable: 'exam_sections.section_items.item_options',
      ascending: true,
    })
    .maybeSingle()

  if (error) {
    throw error
  }

  return data === null ? null : toExamPaperDetail(data)
}
