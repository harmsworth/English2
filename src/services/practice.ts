import type { Tables, TablesInsert, TablesUpdate } from '@/types/database'
import { getSupabaseClient } from '@/services/supabase'

/**
 * Practice 数据层（Phase 5A）。
 *
 * 只建立「会话创建 / 读取 / 暂停-恢复 / 进度保存」与「答题 upsert」所需的最小
 * Service 能力。**不含判分、答案展示、错题、考试、统计**（属后续阶段）。
 *
 * 边界（继承 Phase 4E / 4F 的答案隔离）：本层只处理**用户自己提交的答案数据**，
 * 绝不读取或下发题库的 `correct_option` / `explanation` / `reference_translation` /
 * `source_data`。`practice_answers.is_correct` / `score` 可空，本阶段**不写入、
 * 不计算**（数据库字段存在 ≠ 本阶段实现判分）。
 *
 * 数据链路仍是 Page → Hook → Service → Supabase；本文件是唯一可访问 Supabase 的层。
 * 权限模型：RLS 已把 practice_* 限定为 `auth.uid() = user_id`（答题经 session 归属）；
 * 本层查询仍显式 `.eq('user_id', uid)` 做纵深防御，不把安全完全押在 RLS 上。
 */

/* ------------------------------------------------------------------ *
 * 类型（枚举值来自数据库真实 CHECK 约束，见 parse5a §三 / 实表核对）
 * ------------------------------------------------------------------ */

type SessionRow = Tables<'practice_sessions'>
type SessionInsert = TablesInsert<'practice_sessions'>
type SessionUpdate = TablesUpdate<'practice_sessions'>
type AnswerRow = Tables<'practice_answers'>
type AnswerInsert = TablesInsert<'practice_answers'>

/**
 * `ANSWER_SELECT` 投影出的安全行。**故意不含** `is_correct` / `score`：
 * 按 parse5b §18，判分列不得出现在任何 Practice 响应/DTO 中。
 */
type PracticeAnswerProjection = Pick<
  AnswerRow,
  | 'id'
  | 'session_id'
  | 'item_id'
  | 'selected_option'
  | 'text_answer'
  | 'time_spent_seconds'
  | 'answered_at'
  | 'created_at'
  | 'updated_at'
>

/** `practice_sessions.status` 允许值（DB CHECK: active|paused|completed|abandoned）。 */
export type PracticeStatus = 'active' | 'paused' | 'completed' | 'abandoned'
/**
 * `practice_sessions.session_type` 允许值。
 *
 * - `exam`——整卷练习（绑 paper_id）
 * - `drill`——题型练习（绑 drill_type + drill_years，**跨年份跨试卷**，所以既没有
 *   section_id 也没有 paper_id）
 * - `practice`——单大题练习（绑 section_id，历史形态，当前无 UI 入口）
 * - `mistake`——错题重做（预留）
 */
export type PracticeSessionType = 'practice' | 'exam' | 'drill' | 'mistake'

function isPracticeStatus(value: string): value is PracticeStatus {
  return (
    value === 'active' ||
    value === 'paused' ||
    value === 'completed' ||
    value === 'abandoned'
  )
}

function isPracticeSessionType(value: string): value is PracticeSessionType {
  return (
    value === 'practice' ||
    value === 'exam' ||
    value === 'drill' ||
    value === 'mistake'
  )
}

/**
 * 会话公开 DTO（camelCase）。字段是 UI 会话控制（开始 / 恢复 / 进度 / 暂停）真正需要的，
 * 不机械搬运数据库内部字段。
 */
export type PracticeSession = {
  id: string
  userId: string
  sessionType: PracticeSessionType
  status: PracticeStatus
  sectionId: string | null
  paperId: string | null
  /** 题型练习的题型（中文 section type，如「阅读理解」）；非 drill 会话为 null */
  drillType: string | null
  /** 题型练习覆盖的年份；非 drill 会话为 null */
  drillYears: number[] | null
  currentItemNo: number
  elapsedSeconds: number
  timeLimitSeconds: number | null
  startedAt: string
  pausedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 答题公开 DTO。**只暴露用户自己的作答数据**；判分列 `is_correct` / `score`
 * 既不写入也不回读（不进入任何前端响应），故不出现在此 DTO 中（parse5b §18）。
 */
export type PracticeAnswer = {
  id: string
  sessionId: string
  itemId: string
  selectedOption: number | null
  textAnswer: string | null
  timeSpentSeconds: number
  answeredAt: string | null
  createdAt: string
  updatedAt: string
}

/* ------------------------------------------------------------------ *
 * 错误归一化（Practice 域专用，不复用 / 不改动 Exam 的 toExamErrorMessage）
 * ------------------------------------------------------------------ */

/** 面向 UI 的 Practice 错误；message 可直接展示，不含 Supabase 内部细节或凭据。 */
export class PracticeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PracticeError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readErrorText(source: Record<string, unknown>, key: string): string {
  const value = source[key]
  return typeof value === 'string' ? value : ''
}

function readErrorStatus(
  source: Record<string, unknown>,
  key: string,
): number | null {
  const value = source[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const NETWORK_MARKERS: readonly string[] = [
  'failed to fetch',
  'networkerror',
  'network request failed',
  'fetch failed',
  'load failed',
]
const PERMISSION_CODES: readonly string[] = ['401', '403', '42501']
const SERVER_CODES: readonly string[] = [
  'PGRST000',
  'PGRST001',
  'PGRST002',
  'PGRST003',
]

/** 把 Supabase / Postgres / fetch 等底层错误归一为可展示的中文句子；绝不抛出、绝不返回空串。 */
export function toPracticeErrorMessage(error: unknown): string {
  const parts: string[] = []
  let code = ''
  let status: number | null = null

  if (typeof error === 'string') {
    parts.push(error)
  } else if (error instanceof Error) {
    parts.push(error.message)
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

  if (NETWORK_MARKERS.some((marker) => haystack.includes(marker))) {
    return '网络连接失败，请检查网络后重试。'
  }
  if (
    status === 401 ||
    status === 403 ||
    PERMISSION_CODES.includes(lowerCode) ||
    haystack.includes('permission denied') ||
    haystack.includes('row-level security')
  ) {
    return '请先登录后再进行练习。'
  }
  if (
    (status !== null && status >= 500) ||
    SERVER_CODES.includes(code.toUpperCase()) ||
    /^5\d{4}$/.test(code)
  ) {
    return '练习服务暂时不可用，请稍后重试。'
  }
  // 约束冲突（CHECK / UNIQUE / FK 23xxx）等落到可恢复的通用文案，不外泄细节。
  return '练习操作失败，请稍后重试。'
}

/* ------------------------------------------------------------------ *
 * 显式列白名单（practice_* 表本身不含答案列；仍显式列出，避免 * 语义漂移）
 * ------------------------------------------------------------------ */

const SESSION_SELECT =
  'id, user_id, session_type, status, section_id, paper_id, drill_type, drill_years, current_item_no, elapsed_seconds, time_limit_seconds, started_at, paused_at, completed_at, created_at, updated_at'

const ANSWER_SELECT =
  'id, session_id, item_id, selected_option, text_answer, time_spent_seconds, answered_at, created_at, updated_at'

/* ------------------------------------------------------------------ *
 * 行 → DTO 逐字段映射（数据库类型的唯一消费点；异常状态直接失败，不臆测）
 * ------------------------------------------------------------------ */

function toPracticeSession(row: SessionRow): PracticeSession {
  if (!isPracticeStatus(row.status) || !isPracticeSessionType(row.session_type)) {
    throw new PracticeError('练习数据格式异常，请刷新后重试。')
  }
  return {
    id: row.id,
    userId: row.user_id,
    sessionType: row.session_type,
    status: row.status,
    sectionId: row.section_id,
    paperId: row.paper_id,
    drillType: row.drill_type,
    drillYears: row.drill_years,
    currentItemNo: row.current_item_no,
    elapsedSeconds: row.elapsed_seconds,
    timeLimitSeconds: row.time_limit_seconds,
    startedAt: row.started_at,
    pausedAt: row.paused_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toPracticeAnswer(row: PracticeAnswerProjection): PracticeAnswer {
  return {
    id: row.id,
    sessionId: row.session_id,
    itemId: row.item_id,
    selectedOption: row.selected_option,
    textAnswer: row.text_answer,
    timeSpentSeconds: row.time_spent_seconds,
    answeredAt: row.answered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/* ------------------------------------------------------------------ *
 * 当前用户
 * ------------------------------------------------------------------ */

async function currentUserId(): Promise<string> {
  const supabase = getSupabaseClient()
  // 读本地/内存会话即可（与项目 auth 层 getSession 用法一致）；服务端身份仍由
  // RLS 的 auth.uid() 强制，客户端读本地会话不降低安全性。
  // 不用 auth.getUser()：它每次都对 /auth/v1/user 发起网络校验，频繁调用会被限流
  // 返回 error，进而被误判成「未登录」。
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session?.user) {
    throw new PracticeError('请先登录后再进行练习。')
  }
  return data.session.user.id
}

/* ------------------------------------------------------------------ *
 * Session API
 * ------------------------------------------------------------------ */

/**
 * 创建练习会话的入参。参数由数据库真实约束决定：
 * - `practice` 会话必须带 `sectionId` 且不能带 `paperId`（DB target CHECK）；
 * - `exam` 会话必须带 `paperId`；
 * - `drill` 会话必须带 `drillType` + 至少一个 `drillYears`，且**不能**带
 *   `sectionId` / `paperId`（题型练习跨年份跨试卷，落不到单个 section/paper 上）；
 * - `mistake` 二者皆可选。
 * 这里只做参数装配，不重复实现 CHECK 逻辑（数据库是权威），也不会替你猜默认值。
 */
export type CreatePracticeSessionInput = {
  sessionType: PracticeSessionType
  sectionId?: string
  paperId?: string
  drillType?: string
  drillYears?: number[]
  timeLimitSeconds?: number
}

export async function createPracticeSession(
  input: CreatePracticeSessionInput,
): Promise<PracticeSession> {
  const uid = await currentUserId()
  const supabase = getSupabaseClient()

  const row: SessionInsert = {
    user_id: uid,
    session_type: input.sessionType,
  }
  if (input.sectionId !== undefined) row.section_id = input.sectionId
  if (input.paperId !== undefined) row.paper_id = input.paperId
  if (input.drillType !== undefined) row.drill_type = input.drillType
  if (input.drillYears !== undefined) row.drill_years = input.drillYears
  if (input.timeLimitSeconds !== undefined)
    row.time_limit_seconds = input.timeLimitSeconds

  const { data, error } = await supabase
    .from('practice_sessions')
    .insert(row)
    .select(SESSION_SELECT)
    .single()

  if (error) throw new PracticeError(toPracticeErrorMessage(error))
  return toPracticeSession(data)
}

/** 读取当前用户的某个会话；不属于当前用户或不存在 → null（RLS + 显式 user_id 双保险）。 */
export async function getPracticeSessionById(
  id: string,
): Promise<PracticeSession | null> {
  const uid = await currentUserId()
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('practice_sessions')
    .select(SESSION_SELECT)
    .eq('id', id)
    .eq('user_id', uid)
    .maybeSingle()

  if (error) throw new PracticeError(toPracticeErrorMessage(error))
  return data ? toPracticeSession(data) : null
}

export type PracticeTarget = {
  sessionType: PracticeSessionType
  sectionId?: string
  paperId?: string
  /** drill 会话用它 + drillYears 一起判定「同一次题型练习」 */
  drillType?: string
  drillYears?: number[]
}

/** 年份集合的规范化字符串，用于「同一次题型练习」的精确比对（顺序无关、去重）。 */
function yearsKey(years: number[] | null): string {
  return [...new Set(years ?? [])]
    .sort((a, b) => a - b)
    .join(',')
}

/**
 * 查找可恢复（active / paused）会话，供「暂停 / 恢复」使用。
 *
 * ⚠️ 数据库**没有**保证「一个用户同时只有一个 active 会话」的唯一约束，
 * 因此这里返回的是**符合条件中 updated_at 最新的一条**（不是“唯一的那个”），
 * 不伪造任何“最多一个”的业务规则。若无匹配返回 null。
 *
 * 题型练习（drill）多一道工序：`contains` 只能保证「库里那条包含你选的年份」，
 * 选 3 年时可能命中一次 5 年的练习。所以取最近若干条后，在内存里做
 * **集合相等**判定 —— 恢复的必须是同一次选择，不能张冠李戴。
 */
export async function getResumablePracticeSession(
  target: PracticeTarget,
): Promise<PracticeSession | null> {
  const uid = await currentUserId()
  const supabase = getSupabaseClient()

  let query = supabase
    .from('practice_sessions')
    .select(SESSION_SELECT)
    .eq('user_id', uid)
    .eq('session_type', target.sessionType)
    .in('status', ['active', 'paused'])

  if (target.sectionId !== undefined)
    query = query.eq('section_id', target.sectionId)
  if (target.paperId !== undefined) query = query.eq('paper_id', target.paperId)
  if (target.drillType !== undefined)
    query = query.eq('drill_type', target.drillType)
  if (target.drillYears !== undefined)
    query = query.contains('drill_years', target.drillYears)

  const { data, error } = await query
    .order('updated_at', { ascending: false })
    .limit(20)

  if (error) throw new PracticeError(toPracticeErrorMessage(error))

  const rows = data ?? []
  const wantedKey =
    target.drillYears !== undefined && target.drillYears.length > 0
      ? yearsKey(target.drillYears)
      : null
  const row =
    wantedKey === null
      ? (rows[0] ?? null)
      : (rows.find((candidate) => yearsKey(candidate.drill_years) === wantedKey) ??
        null)

  return row ? toPracticeSession(row) : null
}

/**
 * 列出当前用户**未完成**（active / paused）的会话，最近更新的在前。
 *
 * `practice_sessions` 本身不含任何答案列，RLS 已限本人，所以这里不需要 RPC；
 * 但仍显式 `.eq('user_id', uid)` 做纵深防御。
 *
 * 用途：首页「未完成的练习」提示 + 记录页顶部继续入口。
 * `limit` 默认 20——首页只展示前几条，完整列表走记录页。
 */
export async function getIncompletePracticeSessions(
  limit = 20,
): Promise<PracticeSession[]> {
  const uid = await currentUserId()
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('practice_sessions')
    .select(SESSION_SELECT)
    .eq('user_id', uid)
    .in('status', ['active', 'paused'])
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) throw new PracticeError(toPracticeErrorMessage(error))
  return (data ?? []).map(toPracticeSession)
}

/**
 * 更新会话进度 / 状态。只允许改动进度相关列（不整行覆盖 DTO）。
 * `updated_at` 由数据库 `set_updated_at()` 触发器维护，这里不手动写。
 * 返回更新后的会话；会话不存在 / 非本人 → null。
 */
export type PracticeProgressPatch = {
  currentItemNo?: number
  elapsedSeconds?: number
  timeLimitSeconds?: number
  status?: PracticeStatus
  pausedAt?: string | null
  completedAt?: string | null
}

export async function updatePracticeSessionProgress(
  id: string,
  patch: PracticeProgressPatch,
): Promise<PracticeSession | null> {
  const uid = await currentUserId()
  const supabase = getSupabaseClient()

  const payload: SessionUpdate = {}
  if (patch.currentItemNo !== undefined)
    payload.current_item_no = patch.currentItemNo
  if (patch.elapsedSeconds !== undefined)
    payload.elapsed_seconds = patch.elapsedSeconds
  if (patch.timeLimitSeconds !== undefined)
    payload.time_limit_seconds = patch.timeLimitSeconds
  if (patch.status !== undefined) payload.status = patch.status
  if (patch.pausedAt !== undefined) payload.paused_at = patch.pausedAt
  if (patch.completedAt !== undefined) payload.completed_at = patch.completedAt

  // 空 patch：不改数据，直接回读当前值。
  if (Object.keys(payload).length === 0) {
    return getPracticeSessionById(id)
  }

  const { data, error } = await supabase
    .from('practice_sessions')
    .update(payload)
    .eq('id', id)
    .eq('user_id', uid)
    .select(SESSION_SELECT)
    .maybeSingle()

  if (error) throw new PracticeError(toPracticeErrorMessage(error))
  return data ? toPracticeSession(data) : null
}

/* ------------------------------------------------------------------ *
 * Answer API
 * ------------------------------------------------------------------ */

/**
 * 保存用户对某道题的当前答案。
 *
 * 依据 `practice_answers` 上的 `UNIQUE (session_id, item_id)` 使用 upsert，
 * 重复答同一题不会产生第二条记录。本阶段**不做判分**：不写 `is_correct` /
 * `score`（留数据库默认 null），也不读取题库正确答案。答题的会话归属由 RLS
 * 的 `EXISTS(session WHERE user_id = auth.uid())` 保证。
 */
export type UpsertPracticeAnswerInput = {
  sessionId: string
  itemId: string
  selectedOption?: number
  textAnswer?: string | null
  timeSpentSeconds?: number
}

export async function upsertPracticeAnswer(
  input: UpsertPracticeAnswerInput,
): Promise<PracticeAnswer> {
  await currentUserId()
  const supabase = getSupabaseClient()

  const payload: AnswerInsert = {
    session_id: input.sessionId,
    item_id: input.itemId,
    answered_at: new Date().toISOString(),
  }
  if (input.selectedOption !== undefined)
    payload.selected_option = input.selectedOption
  if (input.textAnswer !== undefined) payload.text_answer = input.textAnswer
  if (input.timeSpentSeconds !== undefined)
    payload.time_spent_seconds = input.timeSpentSeconds

  const { data, error } = await supabase
    .from('practice_answers')
    .upsert(payload, { onConflict: 'session_id,item_id' })
    .select(ANSWER_SELECT)
    .single()

  if (error) throw new PracticeError(toPracticeErrorMessage(error))
  return toPracticeAnswer(data)
}

/**
 * 删除某道题在本会话下的作答（Phase 6 Goal 6.3：「撤销主观题的完成标记」）。
 *
 * 按 `UNIQUE (session_id, item_id)` 精确定位，只删这一行；会话归属由 RLS 的
 * `EXISTS(session WHERE user_id = auth.uid())` 保证，删不到他人数据。
 *
 * 语义上必须真删而不是置空：判分 RPC 的下发范围是「本次会话实际作答过的题」，
 * 只要行还在，撤销后提交仍会看到参考内容 —— 那样「可撤销」就是假的。
 */
export async function deletePracticeAnswer(input: {
  sessionId: string
  itemId: string
}): Promise<void> {
  await currentUserId()
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from('practice_answers')
    .delete()
    .eq('session_id', input.sessionId)
    .eq('item_id', input.itemId)

  if (error) throw new PracticeError(toPracticeErrorMessage(error))
}

/* ------------------------------------------------------------------ *
 * 批量保存作答（交互只改内存，离开页面时一次性落库）
 * ------------------------------------------------------------------ */

/** 一道题待保存的作答差异。 */
export type PracticeAnswerDraft = {
  itemId: string
  /** 选择题选中的选项下标；主观题不需要传 */
  selectedOption?: number | null
  /** 主观题文本（翻译 / 写作）；翻译题的「标记已完成」传空串 */
  textAnswer?: string | null
}

/**
 * 把本次练习期间累积的作答**一次性**写库。
 *
 * 为什么是「批量 + 离开时」而不是「每次交互都写」：
 * 逐次点选项就发请求，会让页面在整个作答过程中持续联网（还会连带刷新缓存），
 * 对用户是纯噪音；而作答数据真正被服务端使用的时刻只有一个 —— **提交判分**。
 * 因此交互只改内存，离开页面时把差异合并成最多两条请求（一次 upsert + 一次 delete）。
 *
 * ⚠️ **提交判分前必须先 await 本函数**：判分 RPC 的下发范围是
 * 「`practice_answers` 里实际存在的行」，没落库就提交会得到一张空结果页。
 */
export async function savePracticeAnswerDrafts(input: {
  sessionId: string
  upserts: PracticeAnswerDraft[]
  deletes: string[]
}): Promise<void> {
  if (input.upserts.length === 0 && input.deletes.length === 0) return
  await currentUserId()
  const supabase = getSupabaseClient()
  const answeredAt = new Date().toISOString()

  if (input.upserts.length > 0) {
    // PostgREST 要求数组里每个对象的键**完全一致**，所以两个可空列都显式给出。
    // 显式 null 在这里是安全的：一道题只可能是选择题或主观题，不会两列都有值。
    const rows: AnswerInsert[] = input.upserts.map((draft) => ({
      session_id: input.sessionId,
      item_id: draft.itemId,
      answered_at: answeredAt,
      selected_option: draft.selectedOption ?? null,
      text_answer: draft.textAnswer ?? null,
    }))
    const { error } = await supabase
      .from('practice_answers')
      .upsert(rows, { onConflict: 'session_id,item_id' })
    if (error) throw new PracticeError(toPracticeErrorMessage(error))
  }

  if (input.deletes.length > 0) {
    const { error } = await supabase
      .from('practice_answers')
      .delete()
      .eq('session_id', input.sessionId)
      .in('item_id', input.deletes)
    if (error) throw new PracticeError(toPracticeErrorMessage(error))
  }
}

/* ------------------------------------------------------------------ *
 * 判分（Phase 6 Goal 6.1，方案 A）
 * ------------------------------------------------------------------ */

/**
 * 一道题的判分结果。
 *
 * 关键边界：**只包含本次会话实际作答过的题**。
 * 未作答的题不在 `practice_answers` 里，RPC 也就不会返回 —— 因此「提交后能看见全大题答案」
 * 这条路是不存在的。题库的 `correct_option` / `explanation` / `extra_data` 依然不对
 * authenticated 开放，答案只经由这一个受控 RPC 出口按题下发。
 *
 * 主观题（翻译 / 写作）：`is_correct` / `correct_option` 为 `null`（不判分）；
 * 翻译题会带 `referenceTranslation`（参考译文），其余为 `null`。
 */
export type PracticeGradeResult = {
  itemId: string
  itemNo: number
  itemType: string
  /** 客观题 true/false；主观题为 null（不判分） */
  isCorrect: boolean | null
  /** 用户自己的选择（0-based）；主观题通常为 null */
  selectedOption: number | null
  /** 0-based 正确选项下标；主观题为 null */
  correctOption: number | null
  /** 解析；无解析时为 null */
  explanation: string | null
  /** 翻译题参考译文；非翻译题为 null */
  referenceTranslation: string | null
}

/**
 * 提交并判分整个大题。
 *
 * 走服务端 RPC `grade_practice_section`（SECURITY DEFINER）：
 * - 答案比对在服务端完成，题库答案列**不下发**给前端常规查询；
 * - RPC 内部校验 `session.user_id = auth.uid()`，传他人 / 伪造 session 会被拒绝；
 * - `is_correct` 由服务端写回，前端不回写（否则用户可篡改自己的判分结果）；
 * - 会话推进到 `completed`。
 *
 * 答案的下发范围 = **本次会话实际作答过的题**，这是刻意的安全边界，不是遗漏。
 * 安全目标不是"用户永远看不到答案"（提交后看到正确答案正是学习闭环的核心），
 * 而是"不能在未作答的情况下批量获取全库答案"。
 */
export async function gradePracticeSection(
  sessionId: string,
): Promise<PracticeGradeResult[]> {
  await currentUserId()
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('grade_practice_section', {
    p_session_id: sessionId,
  })

  if (error) throw new PracticeError(toPracticeErrorMessage(error))

  // Supabase CLI 自动推导 RETURNS TABLE 为非空，但服务端对主观题或无解析/译文情况实际返回 null。
  // 通过业务 DTO 映射层进行防御性空值收敛：
  return (data ?? []).map((row) => ({
    itemId: row.item_id,
    itemNo: row.item_no,
    itemType: row.item_type,
    isCorrect: row.is_correct ?? null,
    selectedOption: row.selected_option ?? null,
    correctOption: row.correct_option ?? null,
    explanation: row.explanation ?? null,
    referenceTranslation: row.reference_translation ?? null,
  }))
}

/* ------------------------------------------------------------------ *
 * 单题答案揭示（「答题时显示答案」开关）
 * ------------------------------------------------------------------ */

/** 一题被提前揭示的答案。字段与判分结果保持一致，便于组件复用。 */
export type RevealedItemAnswer = {
  itemId: string
  /** 0-based 正确选项下标；主观题为 null */
  correctOption: number | null
  explanation: string | null
  /** 翻译题参考译文；非翻译题为 null */
  referenceTranslation: string | null
}

/**
 * 在答题过程中查看**当前这一题**的答案。
 *
 * 与判分的区别：
 * - 判分（`grade_practice_section`）是「提交后按已作答题批量下发」；
 * - 这里是「用户显式打开开关后，一次只取一题」，且不写回判分、不推进会话状态。
 *
 * 安全口径不变：答案仍然**只**经由 SECURITY DEFINER 的 RPC 下发，
 * 常规表查询依旧拿不到 `correct_option` / `explanation`（列级 REVOKE 未动）。
 * 放宽的是"什么时候看"，不是"能不能批量拿"。
 */
export async function peekItemAnswer(input: {
  sessionId: string
  itemId: string
}): Promise<RevealedItemAnswer | null> {
  await currentUserId()
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('peek_item_answer', {
    p_session_id: input.sessionId,
    p_item_id: input.itemId,
  })

  if (error) throw new PracticeError(toPracticeErrorMessage(error))

  const row = (data ?? [])[0]
  if (!row) return null

  return {
    itemId: row.item_id,
    correctOption: row.correct_option ?? null,
    explanation: row.explanation ?? null,
    referenceTranslation: row.reference_translation ?? null,
  }
}

/**
 * 读取当前会话已保存的作答（供刷新 / 重进时恢复选项高亮，parse5b §13）。
 *
 * 只取 `ANSWER_SELECT` 安全列（无判分列）；会话归属由 RLS 的
 * `EXISTS(session WHERE user_id = auth.uid())` 保证，拿不到他人答案。
 * 本函数不判分、不读题库正确答案。
 */
export async function getPracticeAnswers(
  sessionId: string,
): Promise<PracticeAnswer[]> {
  await currentUserId()
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from('practice_answers')
    .select(ANSWER_SELECT)
    .eq('session_id', sessionId)
    .order('answered_at', { ascending: true })

  if (error) throw new PracticeError(toPracticeErrorMessage(error))
  return (data ?? []).map(toPracticeAnswer)
}

/* ------------------------------------------------------------------ *
 * 统计（练习记录页）
 *
 * ⚠️ 为什么要走 RPC 而不是直接查表：
 * `practice_answers.is_correct` / `score` 已被列级 REVOKE，authenticated **读不到**，
 * 所以前端无法自己算分数与正确率。这里新增的两个聚合函数是 SECURITY DEFINER，
 * 自己用 `user_id = auth.uid()` 重新确立归属。
 *
 * 它们**只回计数**（答了几题 / 判了几题 / 对了几题），不回 item_id、不回任何答案内容，
 * 因此无法用来批量取答案 —— 与 `grade_practice_section` / `peek_item_answer`
 * 属同一套受控出口思路，而不是把答案列加回白名单。
 * ------------------------------------------------------------------ */

/** 一条练习记录（含判分聚合）。标题由 UI 按类型拼，service 只给事实字段。 */
export type PracticeSessionStat = {
  sessionId: string
  sessionType: PracticeSessionType
  status: PracticeStatus
  paperId: string | null
  paperYear: number | null
  paperTitle: string | null
  sectionType: string | null
  drillType: string | null
  drillYears: number[] | null
  startedAt: string
  completedAt: string | null
  updatedAt: string
  elapsedSeconds: number
  timeLimitSeconds: number | null
  answeredCount: number
  /** 已判分的客观题数 —— 正确率的分母 */
  gradedCount: number
  correctCount: number
}

export async function getPracticeSessionStats(): Promise<PracticeSessionStat[]> {
  await currentUserId()
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('practice_session_stats')
  if (error) throw new PracticeError(toPracticeErrorMessage(error))

  return (data ?? []).map((row) => {
    // codegen 对 RETURNS TABLE 一律推非空 ⇒ null 收敛只能在这一层做。
    const status: string = row.status
    const sessionType: string = row.session_type
    if (!isPracticeStatus(status) || !isPracticeSessionType(sessionType)) {
      throw new PracticeError('练习数据格式异常，请刷新后重试。')
    }
    return {
      sessionId: row.session_id,
      sessionType,
      status,
      paperId: row.paper_id ?? null,
      paperYear: row.paper_year ?? null,
      paperTitle: row.paper_title ?? null,
      sectionType: row.section_type ?? null,
      drillType: row.drill_type ?? null,
      drillYears: row.drill_years ?? null,
      startedAt: row.started_at,
      completedAt: row.completed_at ?? null,
      updatedAt: row.updated_at,
      elapsedSeconds: row.elapsed_seconds,
      timeLimitSeconds: row.time_limit_seconds ?? null,
      answeredCount: row.answered_count,
      gradedCount: row.graded_count,
      correctCount: row.correct_count,
    }
  })
}

/** 按题型汇总的正确率（用于「各题型掌握度」图表）。 */
export type PracticeTypeAccuracy = {
  sectionType: string
  answeredCount: number
  gradedCount: number
  correctCount: number
}

export async function getPracticeTypeAccuracy(): Promise<PracticeTypeAccuracy[]> {
  await currentUserId()
  const supabase = getSupabaseClient()

  const { data, error } = await supabase.rpc('practice_type_accuracy')
  if (error) throw new PracticeError(toPracticeErrorMessage(error))

  return (data ?? []).map((row) => ({
    sectionType: row.section_type,
    answeredCount: row.answered_count,
    gradedCount: row.graded_count,
    correctCount: row.correct_count,
  }))
}
