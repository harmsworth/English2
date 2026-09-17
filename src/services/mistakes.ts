import { getSupabaseClient } from '@/services/supabase'
import { toPracticeErrorMessage } from '@/services/practice'
import type { Tables, TablesUpdate } from '@/types/database'

/**
 * 错题本读取 / 管理 Service（Phase 7 Goal 7.2 / 7.4）。
 *
 * 边界（继承 Phase 2 / 5C / 6 的答案隔离）：
 * 本层**只读题面与来源**（题干、选项、年份、大题标题、题号），以及**用户自己的作答记录**
 * （`practice_answers.selected_option`）。绝不读取、也绝不返回 `correct_option` /
 * `explanation` / `extra_data` / `source_data` / `passage_zh` / `is_correct`。
 *
 * 错题本**没有**「查看正确答案 / 解析」的入口 —— 这是刻意的：答案的唯一受控出口是
 * 判分 RPC（提交后按题下发）。错题页若能直接展示答案，就等于绕过那道出口。
 * 要看答案只能走「重做 → 判分」（Goal 7.3，已移出本 Phase）。
 *
 * 写入侧只改 `mistakes.status` 及相关时间戳；**错题记录本身由服务端判分 RPC 写入**
 * （Goal 7.1），前端不生成、不修改错题。
 */

/* ------------------------------------------------------------------ *
 * 类型
 * ------------------------------------------------------------------ */

type MistakeRow = Tables<'mistakes'>
type MistakeUpdate = TablesUpdate<'mistakes'>
/** `MISTAKE_SELECT` 投影出的安全行（只含白名单列）。 */
type MistakeProjection = Pick<
  MistakeRow,
  | 'id'
  | 'item_id'
  | 'status'
  | 'first_wrong_at'
  | 'last_wrong_at'
  | 'review_count'
  | 'consecutive_correct'
>
type PaperPublic = Pick<Tables<'exam_papers'>, 'id' | 'year' | 'title'>
type SectionPublic = Pick<Tables<'exam_sections'>, 'id' | 'title' | 'paper_id'>
type ItemPublic = Pick<
  Tables<'section_items'>,
  'id' | 'item_no' | 'item_type' | 'content'
>
type OptionPublic = Pick<Tables<'item_options'>, 'id' | 'option_index' | 'content'>

/** `mistakes.status` 允许值（DB CHECK: active|reviewing|mastered|removed）。 */
export type MistakeStatus = 'active' | 'reviewing' | 'mastered' | 'removed'

function isMistakeStatus(value: string): value is MistakeStatus {
  return (
    value === 'active' ||
    value === 'reviewing' ||
    value === 'mastered' ||
    value === 'removed'
  )
}

/** 页面筛选视图：按状态归组，避免页面自己拼状态判断。 */
export type MistakeGroup = 'open' | 'mastered' | 'removed'

/** 一眼看出某条错题属于哪个视图。 */
export function groupOfStatus(status: MistakeStatus): MistakeGroup {
  if (status === 'mastered') return 'mastered'
  if (status === 'removed') return 'removed'
  return 'open'
}

/**
 * 错题公开 DTO（camelCase）。
 *
 * `lastSelectedOption` 是**用户自己上次选的选项下标**，不是答案：
 * 它来自 `practice_answers`（用户作答记录），不含对错信息。
 */
export type MistakeItem = {
  mistakeId: string
  status: MistakeStatus
  firstWrongAt: string
  lastWrongAt: string
  /** 错题本内「重做」次数；Goal 7.3 落地前恒为 0 */
  reviewCount: number
  /** 重做连续答对次数；Goal 7.3 落地前恒为 0 */
  consecutiveCorrect: number

  itemId: string
  itemNo: number
  itemType: string
  content: string
  options: OptionPublic[]

  /** 缺题面来源时的兜底为 null（FK 链完整时不会是 null，但不臆造） */
  sectionTitle: string | null
  paperId: string | null
  paperYear: number | null
  paperTitle: string | null

  /** 上次选了什么（0-based）；取不到为 null，页面据此决定是否显示该行 */
  lastSelectedOption: number | null
}

/* ------------------------------------------------------------------ *
 * 错误归一化
 * ------------------------------------------------------------------ */

/** 面向 UI 的错题本错误；message 可直接展示，不含 Supabase 内部细节或凭据。 */
export class MistakeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MistakeError'
  }
}

/**
 * 错题本与练习同属「学习数据」域，复用 Practice 的错误分类器，只把域名词换掉 ——
 * 不复制第三套 markdown/网络/权限/服务端错误判定逻辑。
 *
 * 用**查表**而不是子串替换：practice 侧若新增文案，这里会原样透传（不误改、不丢信息）。
 */
const DOMAIN_COPY: Readonly<Record<string, string>> = {
  '请先登录后再进行练习。': '请先登录后再查看错题。',
  '练习服务暂时不可用，请稍后重试。': '错题服务暂时不可用，请稍后重试。',
  '练习操作失败，请稍后重试。': '错题操作失败，请稍后重试。',
  '练习数据格式异常，请刷新后重试。': '错题数据格式异常，请刷新后重试。',
}

export function toMistakeErrorMessage(error: unknown): string {
  const text = toPracticeErrorMessage(error)
  return DOMAIN_COPY[text] ?? text
}

/* ------------------------------------------------------------------ *
 * 显式列白名单（禁止 *）
 * ------------------------------------------------------------------ */

/** `mistakes` 本身不含答案列；仍显式列出，避免 `*` 语义漂移。 */
const MISTAKE_SELECT =
  'id, item_id, status, first_wrong_at, last_wrong_at, review_count, consecutive_correct'

/**
 * 题面 + 来源。三级嵌入都只有**唯一一条外键**，因此 PostgREST 能无歧义推断：
 * section_items.section_id → exam_sections（to-one）→ exam_papers（to-one）；
 * section_items → item_options（to-many，与详情页用的是同一条关系）。
 *
 * 每一级都只取公开列 —— 答案列在库里已被 REVOKE，这里是第二道防线。
 */
const ITEM_SELECT =
  'id, item_no, item_type, content, item_options(id, option_index, content), exam_sections(id, title, paper_id, exam_papers(id, year, title))'

/** 只取「我选了什么」，不取 `is_correct`（判分列对前端不可读）。 */
const LAST_ANSWER_SELECT = 'item_id, selected_option, answered_at'

/* ------------------------------------------------------------------ *
 * 原始返回行（仅本文件内部使用）
 * ------------------------------------------------------------------ */

type RawItemRow = ItemPublic & {
  item_options: OptionPublic[] | null
  exam_sections:
    | (SectionPublic & { exam_papers: PaperPublic | null })
    | null
}

/* ------------------------------------------------------------------ *
 * 当前用户
 * ------------------------------------------------------------------ */

async function currentUserId(): Promise<string> {
  const supabase = getSupabaseClient()
  // 与 practice service 同一取舍：读本地会话即可，服务端身份仍由 RLS 的 auth.uid() 强制。
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.user) {
    throw new MistakeError('请先登录后再查看错题。')
  }
  return data.session.user.id
}

/* ------------------------------------------------------------------ *
 * 读取
 * ------------------------------------------------------------------ */

function toMistakeItem(
  row: MistakeProjection,
  item: RawItemRow,
  lastSelectedOption: number | null,
): MistakeItem {
  if (!isMistakeStatus(row.status)) {
    throw new MistakeError('错题数据格式异常，请刷新后重试。')
  }
  const section = item.exam_sections
  const paper = section?.exam_papers ?? null

  return {
    mistakeId: row.id,
    status: row.status,
    firstWrongAt: row.first_wrong_at,
    lastWrongAt: row.last_wrong_at,
    reviewCount: row.review_count,
    consecutiveCorrect: row.consecutive_correct,

    itemId: item.id,
    itemNo: item.item_no,
    itemType: item.item_type,
    // 题干列可空；DTO 统一用字符串，缺题面时渲染空行而不是 "null"。
    content: item.content ?? '',
    // 服务端不保证嵌入数组顺序，这里显式排序（不依赖 PostgreSQL 默认返回顺序）。
    options: [...(item.item_options ?? [])].sort(
      (a, b) => a.option_index - b.option_index,
    ),

    sectionTitle: section?.title ?? null,
    paperId: paper?.id ?? null,
    paperYear: paper?.year ?? null,
    paperTitle: paper?.title ?? null,

    lastSelectedOption,
  }
}

/**
 * 读取当前用户的全部错题（含题面与来源）。
 *
 * 两步查询，而不是从 `mistakes` 一次嵌入到底：
 * 错题本要的是「一堆散题 + 各自来源」，跨 4 张表的多级嵌入一旦涉及同表重复嵌入或
 * 排序需求，PostgREST 的别名规则很容易踩坑（前几个 Phase 已实测过）。
 * 两步都能用最朴素的 select + in，行为可预期。
 *
 * 排序：`last_wrong_at` 倒序（最近错的在前）—— 这既是用户直觉，也是「我该复习什么」的答案。
 * 首版不做分页：错题上限为题库总量 816，个人使用量级可控。
 */
export async function listMistakes(): Promise<MistakeItem[]> {
  const uid = await currentUserId()
  const supabase = getSupabaseClient()

  const { data: mistakeRows, error: mistakeError } = await supabase
    .from('mistakes')
    .select(MISTAKE_SELECT)
    .eq('user_id', uid)
    .order('last_wrong_at', { ascending: false })

  if (mistakeError) throw new MistakeError(toMistakeErrorMessage(mistakeError))

  const rows = mistakeRows ?? []
  if (rows.length === 0) return []

  const itemIds = rows.map((row) => row.item_id)

  const [itemsResult, answersResult] = await Promise.all([
    supabase.from('section_items').select(ITEM_SELECT).in('id', itemIds),
    // 只查选项型作答（主观题标记行 selected_option 为 null，不参与「上次选了哪个」）。
    // 会话归属由 RLS 的 EXISTS(session WHERE user_id = auth.uid()) 保证。
    supabase
      .from('practice_answers')
      .select(LAST_ANSWER_SELECT)
      .in('item_id', itemIds)
      .not('selected_option', 'is', null)
      .order('answered_at', { ascending: false }),
  ])

  if (itemsResult.error) {
    throw new MistakeError(toMistakeErrorMessage(itemsResult.error))
  }
  if (answersResult.error) {
    throw new MistakeError(toMistakeErrorMessage(answersResult.error))
  }

  const itemById = new Map<string, RawItemRow>()
  for (const row of itemsResult.data ?? []) itemById.set(row.id, row)

  // 已按 answered_at 倒序，每题第一条即「最近一次选择」。
  const lastSelectedByItem = new Map<string, number>()
  for (const row of answersResult.data ?? []) {
    if (row.selected_option === null) continue
    if (lastSelectedByItem.has(row.item_id)) continue
    lastSelectedByItem.set(row.item_id, row.selected_option)
  }

  const result: MistakeItem[] = []
  for (const row of rows) {
    const item = itemById.get(row.item_id)
    // 题面取不到时跳过，不拼一条半截卡片 —— 但仍然不动数据库里的错题记录。
    if (!item) continue
    result.push(
      toMistakeItem(row, item, lastSelectedByItem.get(row.item_id) ?? null),
    )
  }
  return result
}

/* ------------------------------------------------------------------ *
 * 状态管理（Goal 7.4）
 * ------------------------------------------------------------------ */

/**
 * 改错题状态：标记已掌握 / 移出错题本 / 撤销。
 *
 * - 纯前端写 `mistakes`（`authenticated` 已有 UPDATE，RLS 限 `auth.uid() = user_id`），
 *   **不需要任何 DB 变更**；
 * - `updated_at` **不手写** —— 数据库有 `mistakes_updated_at` 触发器（`set_updated_at()`）；
 * - `mastered_at` / `removed_at` 与状态**成对维护**，撤销时一并置 null，
 *   避免留下"已恢复但 mastered_at 还在"的脏数据。
 */
export async function updateMistakeStatus(input: {
  mistakeId: string
  status: MistakeStatus
}): Promise<MistakeStatus> {
  const uid = await currentUserId()
  const supabase = getSupabaseClient()
  const now = new Date().toISOString()

  const payload: MistakeUpdate = { status: input.status }
  if (input.status === 'mastered') {
    payload.mastered_at = now
    payload.removed_at = null
  } else if (input.status === 'removed') {
    payload.removed_at = now
    payload.mastered_at = null
  } else {
    payload.mastered_at = null
    payload.removed_at = null
  }

  const { data, error } = await supabase
    .from('mistakes')
    .update(payload)
    .eq('id', input.mistakeId)
    .eq('user_id', uid)
    .select('id, status')
    .maybeSingle()

  if (error) throw new MistakeError(toMistakeErrorMessage(error))
  // RLS 不匹配时 update 影响 0 行且不报错 —— 必须显式识别，否则会静默失败。
  if (!data) throw new MistakeError('这道错题不存在，或不属于当前账号。')

  if (!isMistakeStatus(data.status)) {
    throw new MistakeError('错题数据格式异常，请刷新后重试。')
  }
  return data.status
}
