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
 * ⚠️ Phase 5C / passage_zh 收口：`exam_sections` 现在只用一个别名 `all` 嵌入，
 *   且**不再投影 `passage_zh`**（该列不再经普通 REST 下发；翻译参考译文等同答案，
 *   仍保留在库内，未来如需展示走专门 RPC / 视图）。`order` 的 `referencedTable`
 *   用别名前缀 `all` / `all.section_items` / `all.section_items.item_options`。
 */
const PAPER_DETAIL_SELECT =
  'id, year, title, all:exam_sections(id, paper_id, source_id, type, title, score, minutes, intro, passage, prompt, tips, extra_data, sort_order, section_items(id, item_no, item_type, content, item_options(id, option_index, content)))' as const

/* ------------------------------------------------------------------ *
 * 数据库原始返回行（仅本文件内部使用）
 * ------------------------------------------------------------------ */

type RawItemRow = ExamItem & { item_options: ExamOption[] }
/** 公开 section + 其小题。 */
type RawSectionRow = ExamSection & {
  section_items: RawItemRow[]
}
type RawPaperDetailRow = ExamPaper & { all: RawSectionRow[] }

/**
 * 把数据库返回的嵌套行整理成前端 DTO：显式逐字段重建 + 强制排序。
 *
 * 逐字段重建（而不是 `...row`）是刻意的第二道防线：即使将来查询白名单被改宽，
 * 多出来的列也不会自动流进 DTO。排序则是为了不依赖 PostgreSQL 的默认返回顺序。
 */
function toExamPaperDetail(row: RawPaperDetailRow): ExamPaperDetail {
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
 * `passage_zh` 不再下发（Phase 5C 收口）：查询已移除该列，翻译参考译文 / 非翻译题
 * 中文参考均不经普通 REST 到前端；未来如需展示走专门 RPC / 视图。
 */
export async function getExamPaperById(
  paperId: string,
): Promise<ExamPaperDetail | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('exam_papers')
    .select(PAPER_DETAIL_SELECT)
    .eq('id', paperId)
    // order 的 referencedTable 用嵌入别名 `all`。
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

/* ------------------------------------------------------------------ *
 * 错误文案归一化（Phase 4F-3 / F7）
 *
 * 底线：底层错误（Supabase / PostgREST / fetch / 任意异常）的内部结构
 * **只允许停在本文件**。页面拿到的是一个已经可以直接渲染的中文句子，
 * 因此永远不会出现 `Failed to fetch`、`PGRST116`、`permission denied`
 * 这类把实现细节暴露给用户的文案。
 * ------------------------------------------------------------------ */

/** 判断 `unknown` 能否按属性安全访问（排除 null 与数组）。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** 安全读取一个字符串字段；缺失或类型不符时返回空串。 */
function readErrorText(source: Record<string, unknown>, key: string): string {
  const value = source[key]
  return typeof value === 'string' ? value : ''
}

/** 安全读取一个数字字段（同时接受 `"500"` 这类纯数字字符串）。 */
function readErrorStatus(
  source: Record<string, unknown>,
  key: string,
): number | null {
  const value = source[key]
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

/** 网络层失败的常见文案：浏览器 / Node / undici 各不相同，只能靠文案识别。 */
const NETWORK_ERROR_MARKERS: readonly string[] = [
  'failed to fetch',
  'networkerror',
  'network request failed',
  'fetch failed',
  'load failed',
]

/** 权限类错误码：HTTP 401 / 403 + PostgreSQL 42501（permission denied）。 */
const PERMISSION_ERROR_CODES: readonly string[] = ['401', '403', '42501']

/** 资源不存在：PostgREST 单行查询空结果（PGRST116）+ HTTP 404。 */
const NOT_FOUND_ERROR_CODES: readonly string[] = ['pgrst116', '404']

/** PostgREST 自身的连接 / 服务级错误码，均属 5xx。 */
const SERVER_ERROR_CODES: readonly string[] = [
  'PGRST000',
  'PGRST001',
  'PGRST002',
  'PGRST003',
]

/** 服务端故障文案：PostgREST / 网关 5xx 的常见措辞。 */
const SERVER_ERROR_MARKERS: readonly string[] = [
  'internal server error',
  'bad gateway',
  'service unavailable',
  'gateway timeout',
  'database error',
]

/**
 * 把底层错误归一为可直接展示给用户的中文文案。
 *
 * 设计原则：
 * - 入参是 `unknown`：React Query 抛出的东西不保证是 `Error`，可能是任意值。
 * - **绝不抛出、绝不返回空串** —— 调用方拿到的永远是可渲染的一句话。
 * - 只做「类型守卫 + 文案匹配」，不臆测 Supabase 错误的完整结构：
 *   `message` / `code` / `status` 均为**可选**读取，缺失即落到兜底分支。
 * - 页面对错误结构零感知：这里返回什么，页面就展示什么。
 *
 * 分类（按匹配顺序）：
 * A. 网络层     → 网络连接失败，请检查网络后重试。
 * B. 权限       → 当前无法访问题库，请重新登录后重试。
 * C. 不存在     → 试卷不存在（与详情页既有的 404 文案保持一致）
 * D. 服务端 5xx → 题库服务暂时不可用，请稍后重试。
 * E. 兜底       → 题库加载失败，请稍后重试。
 */
export function toExamErrorMessage(error: unknown): string {
  const parts: string[] = []
  let code = ''
  let status: number | null = null

  if (typeof error === 'string') {
    parts.push(error)
  } else if (isRecord(error)) {
    parts.push(
      readErrorText(error, 'message'),
      readErrorText(error, 'details'),
      readErrorText(error, 'hint'),
    )
    code = readErrorText(error, 'code')
    status =
      readErrorStatus(error, 'status') ?? readErrorStatus(error, 'statusCode')
  }

  const haystack = parts.join(' ').toLowerCase()
  const lowerCode = code.toLowerCase()

  // A. 网络层：请求根本没到服务端（离线 / DNS / 代理中断 / 连接被掐断）。
  if (NETWORK_ERROR_MARKERS.some((marker) => haystack.includes(marker))) {
    return '网络连接失败，请检查网络后重试。'
  }

  // B. 权限：未登录、token 失效或 RLS 拒绝。
  if (
    status === 401 ||
    status === 403 ||
    PERMISSION_ERROR_CODES.includes(lowerCode) ||
    haystack.includes('permission denied') ||
    haystack.includes('row-level security')
  ) {
    return '当前无法访问题库，请重新登录后重试。'
  }

  // C. 不存在：试卷已被下线，或路由参数根本不是有效 id。
  if (
    status === 404 ||
    NOT_FOUND_ERROR_CODES.includes(lowerCode) ||
    haystack.includes('pgrst116')
  ) {
    return '试卷不存在'
  }

  // D. 服务端故障：PostgREST / 网关 5xx（含 SQLSTATE 5 类错误码）。
  if (
    (status !== null && status >= 500) ||
    SERVER_ERROR_CODES.includes(code.toUpperCase()) ||
    /^5\d{4}$/.test(code) ||
    SERVER_ERROR_MARKERS.some((marker) => haystack.includes(marker))
  ) {
    return '题库服务暂时不可用，请稍后重试。'
  }

  // E. 兜底：不把任何底层细节透给用户。
  return '题库加载失败，请稍后重试。'
}
