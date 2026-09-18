import { getSupabaseClient } from '@/services/supabase'
import {
  peekItemAnswer,
  toPracticeErrorMessage,
  type RevealedItemAnswer,
} from '@/services/practice'
import { toExamStem, type ExamStem } from '@/services/exam-stem'
import type { Tables, TablesUpdate } from '@/types/database'

/**
 * 错题本读取 / 管理 Service（Phase 7 Goal 7.2 / 7.4）。
 *
 * 边界（继承 Phase 2 / 5C / 6 的答案隔离）：
 * 本层的**常规查询**只读题面与来源（大题原文 / 要求 / 题干、选项、年份、大题标题、题号），
 * 以及**用户自己的作答记录**（`practice_answers.selected_option`）。
 * 绝不通过常规查询读取 `correct_option` / `explanation` / `extra_data` /
 * `source_data` / `passage_zh` / `is_correct` —— 列级 REVOKE 一行未动。
 *
 * 答案与解析**按需**下发，走的是练习页那个**同一个受控出口** `peek_item_answer`
 * （SECURITY DEFINER + 校验会话归属 + 一次只回一题），见 `revealMistakeAnswer`。
 * 这不是新开的口子：错题的定义就是「我答错过、且已经被判分过」的题，
 * 答案本就该在作答之后可见；要守的是「不能在未作答时批量拿走全库答案」，
 * 而 peek 的 scoped 校验仍然卡着这条线。做法上刻意**不**做成列表页一次性批量拉答案。
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
/**
 * 大题的公开字段 —— 比 `ExamSection` 窄：只嵌入构造题干真正要用的列
 * （`ExamStemSource`），不为凑类型多投影 `score` / `minutes` / `sort_order`。
 */
type SectionPublic = Pick<
  Tables<'exam_sections'>,
  'id' | 'title' | 'paper_id' | 'type' | 'intro' | 'passage' | 'prompt' | 'tips' | 'extra_data'
>
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
 * 某道错题的**一次**作答 —— 只含用户自己的选择，不含任何对错信息。
 *
 * ⚠️ 「这次错了没有」**不能**读 `practice_answers.is_correct`（该列已列级 REVOKE）。
 * 要等用户点开答案、拿到 `correctOption` 之后，由前端把 `selectedOption` 与它比对
 * 才能得出 —— 这正是「作答历史」上的对错标记只在揭示答案之后才出现的原因。
 */
export type MistakeAttempt = {
  /** 用户选了什么（0-based） */
  selectedOption: number
  /**
   * 这次作答的时间。列在 codegen 里是 `string | null`（可能没有值），
   * 所以**排序契约是数组顺序，不是这个字段** —— 查询已经按 `answered_at desc` 取回。
   * 展示时间前请先判空。
   */
  answeredAt: string | null
  /**
   * 来源会话。`practice_answers` 是 `UNIQUE(session_id, item_id)`，
   * 所以同一道题的每次作答落在**不同**会话 ⇒ 它可以当列表 key，也够 `peek_item_answer` 用。
   */
  sessionId: string
}

/**
 * 错题公开 DTO（camelCase）。
 *
 * 「我选过什么」来自 `practice_answers`（用户自己的作答记录），**不含对错信息**。
 *
 * ⚠️ 同一道题可能被答过多次（同一套卷反复练），所以这里给的是**全部作答**，
 * 而不是最新一条：只留最新一条，「第一次选 A、第二次选 B」这段历史会凭空消失，
 * 而错题本恰恰要回答「这题我反复错在哪」。也因此**不引入** `lastSelectedOption`
 * 这种派生字段 —— 需要最新一次时用 `attempts[0]`，避免两个真源。
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
  /** 题型（`exam_sections.type`，如「阅读理解」）—— 页面按它筛选；缺大题时为 null */
  sectionType: string | null
  paperId: string | null
  paperYear: number | null
  paperTitle: string | null

  /**
   * 大题题干上下文（原文 / 要求 / 图表）。
   *
   * 小题题面常常只是一句提问（「According to Paragraph 3…」），不带大题原文就
   * 「无法理解自己错在哪」—— 所以错题卡片和练习页共用同一份 `ExamStem`。
   * 与练习页同口径：只用公开字段，不含任何答案列。
   *
   * ⚠️ 渲染由 `MistakeSectionGroup` **按大题统一渲染一次**（同一篇阅读的 5 道错题
   * 共用一个题干），卡片自己不再渲染它 —— 否则 5 张卡片会把同一段 2400 字原文
   * 重复 5 遍。
   */
  stem: ExamStem | null

  /** 该题的全部客观题作答，**按作答时间倒序**（最新在前）；没答过为空数组 */
  attempts: MistakeAttempt[]
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

/**
 * 展示用文案（页面统一用这个，而不是直接 `toMistakeErrorMessage`）。
 *
 * 本层所有 `throw` 都已经把原因归一化成面向用户的中文再包进 `MistakeError`
 * （「请先登录…」「这道错题不存在…」），所以它可以直接展示。
 * ⚠️ 别把 `MistakeError` 再塞回归一化器：那会**丢掉具体原因** ——
 * `toPracticeErrorMessage` 认不出中文业务文案，会退化成通用兜底。
 */
export function toMistakeMessage(error: unknown): string {
  if (error instanceof MistakeError) return error.message
  return toMistakeErrorMessage(error)
}

/* ------------------------------------------------------------------ *
 * 显式列白名单（禁止 *）
 * ------------------------------------------------------------------ */

/** `mistakes` 本身不含答案列；仍显式列出，避免 `*` 语义漂移。 */
const MISTAKE_SELECT =
  'id, item_id, status, first_wrong_at, last_wrong_at, review_count, consecutive_correct'

/**
 * 题面 + 来源 + 大题题干。三级嵌入都只有**唯一一条外键**，因此 PostgREST 能无歧义推断：
 * section_items.section_id → exam_sections（to-one）→ exam_papers（to-one）；
 * section_items → item_options（to-many，与详情页用的是同一条关系）。
 *
 * 每一级都只取公开列 —— 答案列在库里已被 REVOKE，这里是第二道防线。
 * `exam_sections` 投影的是 `ExamStemSource`（题干用得到的列），**不含**
 * `source_data`（已 REVOKE）与 `passage_zh`（同样不下发）。
 */
const ITEM_SELECT =
  'id, item_no, item_type, content, item_options(id, option_index, content), exam_sections(id, title, paper_id, type, intro, passage, prompt, tips, extra_data, exam_papers(id, year, title))'

/**
 * 作答历史：只取「我选了什么、什么时候、在哪个会话」，**不取** `is_correct`
 * （判分列对前端不可读，这是答案边界的一部分，不是遗漏）。
 */
const ANSWER_HISTORY_SELECT = 'item_id, session_id, selected_option, answered_at'

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
  attempts: MistakeAttempt[],
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
    sectionType: section?.type ?? null,
    paperId: paper?.id ?? null,
    paperYear: paper?.year ?? null,
    paperTitle: paper?.title ?? null,

    // 大题缺行时不臆造一个空 stem —— 分组组件会据此把它归到「来源未知」一组。
    stem: section ? toExamStem(section) : null,

    attempts,
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
 *
 * ⚠️ 这里返回的是**扁平的题目列表**，不预先按大题分组：页面要先按状态 / 年份 / 题型
 * 筛选，**筛完之后的**分组才成立（按未筛选的数据分组会留下空组）。
 * 分组由页面的 `MistakeSectionGroup` 按 `stem.key`（= 大题 id）完成。
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
    // 只查选项型作答（主观题标记行 selected_option 为 null，不进作答历史）。
    // 会话归属由 RLS 的 EXISTS(session WHERE user_id = auth.uid()) 保证。
    supabase
      .from('practice_answers')
      .select(ANSWER_HISTORY_SELECT)
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

  // 已按 answered_at 倒序 ⇒ 每题的数组天然「最新在前」，卡片直接取 attempts[0] 即最近一次。
  // 这里保留**全部**作答（同一套卷练第二遍就会有第二条），而不是只留最新一条。
  const attemptsByItem = new Map<string, MistakeAttempt[]>()
  for (const row of answersResult.data ?? []) {
    if (row.selected_option === null) continue
    const attempt: MistakeAttempt = {
      selectedOption: row.selected_option,
      answeredAt: row.answered_at,
      sessionId: row.session_id,
    }
    const list = attemptsByItem.get(row.item_id)
    if (list) list.push(attempt)
    else attemptsByItem.set(row.item_id, [attempt])
  }

  const result: MistakeItem[] = []
  for (const row of rows) {
    const item = itemById.get(row.item_id)
    // 题面取不到时跳过，不拼一条半截卡片 —— 但仍然不动数据库里的错题记录。
    if (!item) continue
    result.push(toMistakeItem(row, item, attemptsByItem.get(row.item_id) ?? []))
  }
  return result
}

/* ------------------------------------------------------------------ *
 * 答案与解析揭示（按题、按需）
 * ------------------------------------------------------------------ */

/**
 * 取**一条**错题的正确答案与解析。
 *
 * 三步，全程走已有受控通路：
 * 1. 先在 `practice_answers` 里回查「这道题在哪个会话里被我答过」（RLS own-only）。
 *    必须反查的原因：`mistakes` **没有 session 外键**（只有 user_id + item_id），
 *    从错题行本身推不出来源会话；
 * 2. 拿那个会话 id 调 `peek_item_answer` —— 服务端再校验一次会话归属与题目的
 *    section/paper/drill 范围，且**一次只回这一题**；
 * 3. 原样返回与练习页相同的 `RevealedItemAnswer` DTO，两边渲染口径一致。
 *
 * 为什么**不**新增一个「批量取错题答案」的 RPC：那等于把「一次一题」的限速拆掉，
 * 一次请求就能把全库答案拖走。现在这样每次只揭示用户点开的那一题，
 * 而且**必须先有作答记录**才拿得到 —— 没答过的题连会话都找不到。
 * 要守的边界（不能在未作答时批量拿答案）没动：列级 REVOKE 与列白名单一行未改。
 *
 * 查不到作答记录时抛明确文案，而不是静默返回 null —— 页面要能区分
 * 「这题确实没答案」与「这题的记录已经没了」。
 */
export async function revealMistakeAnswer(input: {
  itemId: string
}): Promise<RevealedItemAnswer> {
  await currentUserId()
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('practice_answers')
    .select('session_id, answered_at')
    .eq('item_id', input.itemId)
    .order('answered_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new MistakeError(toMistakeErrorMessage(error))
  if (!data) {
    throw new MistakeError('这道题没有作答记录，暂时无法显示答案与解析。')
  }

  let answer: RevealedItemAnswer | null
  try {
    answer = await peekItemAnswer({
      sessionId: data.session_id,
      itemId: input.itemId,
    })
  } catch (cause) {
    // peek 抛的是 PracticeError（文案是「练习…」口径），翻成错题本口径再往上抛。
    throw new MistakeError(toMistakeErrorMessage(cause))
  }
  if (!answer) {
    throw new MistakeError('这道题的答案暂时取不到，请稍后重试。')
  }
  return answer
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
