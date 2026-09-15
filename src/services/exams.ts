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
 *
 * ── Phase 4E：公开 DTO 与数据库类型分离 ────────────────────────────────
 * 数据库行类型（`Tables<...>`）仍然保留 `correct_option` / `explanation` /
 * `source_data` 等字段，但**详情页 API 只返回下面的公开 DTO**。
 * 所有查询一律使用显式列白名单（禁止 `*`），答案永远不会进入浏览器网络层。
 */

/* ------------------------------------------------------------------ *
 * Public DTO —— 只包含 UI 真正渲染的字段
 * ------------------------------------------------------------------ */

/** 一行试卷（exam_papers）的公开字段。 */
export type ExamPaper = Pick<Tables<'exam_papers'>, 'id' | 'year' | 'title'>

/**
 * 一行大题（exam_sections）的公开字段。
 *
 * ⚠️ 故意排除 `source_data`：它是该题的原始 JSON，内含 `questions` / `blanks`
 * 与每个小题的 `ans`（正确答案）和 `explain`（解析），实测 153 个大题里有 102 个
 * 带答案。`created_at` / `updated_at` 与渲染无关，同样不下发。
 */
export type ExamSection = Pick<
  Tables<'exam_sections'>,
  | 'id'
  | 'paper_id'
  | 'source_id'
  | 'type'
  | 'title'
  | 'score'
  | 'minutes'
  | 'intro'
  | 'passage'
  | 'passage_zh'
  | 'prompt'
  | 'tips'
  | 'extra_data'
  | 'sort_order'
>

/**
 * 一行小题（section_items）的公开字段。
 *
 * ⚠️ 故意排除 `correct_option`（正确答案下标，0-based）与 `explanation`（解析），
 * 以及 `extra_data`：翻译小题的 `extra_data.reference_translation` 就是参考答案。
 * `section_items.extra_data` 里唯一被 UI 用到的 `chart` 布尔值只是兜底，
 * 正文数据里 17 个写作大题的 `exam_sections.extra_data.chart` 全部存在，故无需下发。
 */
export type ExamItem = Pick<
  Tables<'section_items'>,
  'id' | 'item_no' | 'item_type' | 'content'
>

/** 一行选项（item_options）的公开字段。该表本身没有 is_correct。 */
export type ExamOption = Pick<
  Tables<'item_options'>,
  'id' | 'option_index' | 'content'
>

/**
 * 小题 + 它的选项。
 *
 * 只有 choice 类小题有选项；翻译 / 写作是 text 类，`options` 为空数组。
 */
export type ExamItemWithOptions = ExamItem & { options: ExamOption[] }

/** 大题 + 它的小题 */
export type ExamSectionWithItems = ExamSection & { items: ExamItemWithOptions[] }

/** 试卷完整详情：paper → sections → items → options（全部为公开 DTO） */
export type ExamPaperDetail = ExamPaper & { sections: ExamSectionWithItems[] }

/* ------------------------------------------------------------------ *
 * 显式列白名单（禁止 *）
 * ------------------------------------------------------------------ */

/** 列表：只要年份与标题。 */
const PAPER_LIST_SELECT = 'id, year, title' as const

/**
 * 详情：一次四层关系查询，但每一级都只取公开字段。
 *
 * 白名单即契约 —— 新增字段必须显式加进来，避免今后有人用 `*`
 * 把 `correct_option` / `explanation` / `source_data` 又带回前端。
 *
 * ── Phase 4F-1：翻译题的 `passage_zh` 不再下发 ──────────────────────────────
 * `exam_sections` 在同一次查询里被**嵌入两次**（同一关系重复嵌入必须带别名）：
 *
 * - `all`：完整的公开 section + `section_items` + `item_options`。**故意不含
 *   `passage_zh`**。
 * - `zh` ：只投影 `id, passage_zh`，并用 `zh.type=neq.翻译` 把翻译题挡在外面。
 *
 * 为什么这么做：`passage_zh` 对翻译题而言就是参考答案，但它是普通的行内列，
 * 而 PostgREST 不支持在 `select` 里按行条件取舍（`coalesce` / `nullif` 之类
 * 函数会被 PGRST100 拒绝）。于是把「要不要下发 `passage_zh`」交给一个**只投影
 * 该列**的别名层承担：翻译题不在 `zh` 层里 → 它的中文参考译文根本不会出现在
 * 响应体中。客户端再按 `id` 把 `zh` 合并回 `all`（见 `toExamPaperDetail`）。
 *
 * ⚠️ `order` 的 `referencedTable` 必须改用别名前缀（`all` / `all.section_items`
 * / `all.section_items.item_options`）：继续用真实表名会得到
 * `400 'section_items' is not an embedded resource in this request`。
 */
const PAPER_DETAIL_SELECT =
  'id, year, title, all:exam_sections(id, paper_id, source_id, type, title, score, minutes, intro, passage, prompt, tips, extra_data, sort_order, section_items(id, item_no, item_type, content, item_options(id, option_index, content))), zh:exam_sections(id, passage_zh)' as const

/* ------------------------------------------------------------------ *
 * 数据库原始返回行（仅本文件内部使用）
 * ------------------------------------------------------------------ */

type RawItemRow = ExamItem & { item_options: ExamOption[] }
/** `all` 层：完整公开 section（不含 `passage_zh`）。 */
type RawSectionRow = Omit<ExamSection, 'passage_zh'> & {
  section_items: RawItemRow[]
}
/** `zh` 层：只为非翻译题提供 `passage_zh`。 */
type RawZhRow = Pick<Tables<'exam_sections'>, 'id' | 'passage_zh'>
type RawPaperDetailRow = ExamPaper & { all: RawSectionRow[]; zh: RawZhRow[] }

/**
 * 把数据库返回的嵌套行整理成前端 DTO：显式逐字段重建 + 强制排序。
 *
 * 逐字段重建（而不是 `...row`）是刻意的第二道防线：即使将来查询白名单被改宽，
 * 多出来的列也不会自动流进 DTO。排序则是为了不依赖 PostgreSQL 的默认返回顺序。
 *
 * Phase 4F-1：`passage_zh` 只从 `zh` 别名层取。翻译题不在 `zh` 层 → 合并结果
 * 为 `undefined` → 归一为 `null`，翻译题的参考译文永远不会进入 DTO。
 */
function toExamPaperDetail(row: RawPaperDetailRow): ExamPaperDetail {
  const zhById = new Map(row.zh.map((entry) => [entry.id, entry.passage_zh]))

  return {
    id: row.id,
    year: row.year,
    title: row.title,
    sections: [...row.all]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((section) => ({
        id: section.id,
        paper_id: section.paper_id,
        source_id: section.source_id,
        type: section.type,
        title: section.title,
        score: section.score,
        minutes: section.minutes,
        intro: section.intro,
        passage: section.passage,
        // 非翻译题从 zh 层取回 passage_zh；翻译题不在 zh 层，得到 null。
        passage_zh: zhById.get(section.id) ?? null,
        prompt: section.prompt,
        tips: section.tips,
        extra_data: section.extra_data,
        sort_order: section.sort_order,
        items: [...section.section_items]
          .sort((a, b) => a.item_no - b.item_no)
          .map((item) => ({
            id: item.id,
            item_no: item.item_no,
            item_type: item.item_type,
            content: item.content,
            options: [...item.item_options]
              .sort((a, b) => a.option_index - b.option_index)
              .map((option) => ({
                id: option.id,
                option_index: option.option_index,
                content: option.content,
              })),
          })),
      })),
  }
}

/* ------------------------------------------------------------------ *
 * 读取 API
 * ------------------------------------------------------------------ */

/**
 * 当前版本试卷列表。
 *
 * 过滤 is_current = true，按 year 倒序。只返回 id / year / title。
 */
export async function getCurrentExamPapers(): Promise<ExamPaper[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('exam_papers')
    .select(PAPER_LIST_SELECT)
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
 *
 * 返回的 `ExamPaperDetail` 不含任何答案字段 —— 答案从未离开数据库。
 * 翻译题的 `passage_zh`（即参考译文）同样不会下发：它被 `zh` 别名层的
 * `zh.type=neq.翻译` 过滤挡在响应体之外，合并后为 `null`（Phase 4F-1）。
 */
export async function getExamPaperById(
  paperId: string,
): Promise<ExamPaperDetail | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('exam_papers')
    .select(PAPER_DETAIL_SELECT)
    .eq('id', paperId)
    // 只让 `zh` 别名层携带非翻译题的 `passage_zh`：翻译题被这一行过滤掉，
    // 它的中文参考译文因此不会出现在响应体中（见 PAPER_DETAIL_SELECT 注释）。
    .neq('zh.type', '翻译')
    // order 的 referencedTable 必须用别名前缀 —— 用真实表名会 400。
    .order('sort_order', { referencedTable: 'all', ascending: true })
    .order('item_no', {
      referencedTable: 'all.section_items',
      ascending: true,
    })
    .order('option_index', {
      referencedTable: 'all.section_items.item_options',
      ascending: true,
    })
    .maybeSingle()

  if (error) {
    throw error
  }

  return data === null ? null : toExamPaperDetail(data)
}
