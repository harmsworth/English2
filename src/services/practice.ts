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

/** `practice_sessions.status` 允许值（DB CHECK: active|paused|completed|abandoned）。 */
export type PracticeStatus = 'active' | 'paused' | 'completed' | 'abandoned'
/** `practice_sessions.session_type` 允许值（DB CHECK: practice|exam|mistake）。 */
export type PracticeSessionType = 'practice' | 'exam' | 'mistake'

function isPracticeStatus(value: string): value is PracticeStatus {
  return (
    value === 'active' ||
    value === 'paused' ||
    value === 'completed' ||
    value === 'abandoned'
  )
}

function isPracticeSessionType(value: string): value is PracticeSessionType {
  return value === 'practice' || value === 'exam' || value === 'mistake'
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
  currentItemNo: number
  elapsedSeconds: number
  timeLimitSeconds: number | null
  startedAt: string
  pausedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

/** 答题公开 DTO。`isCorrect` / `score` 本阶段恒为数据库存下的 null（不判分）。 */
export type PracticeAnswer = {
  id: string
  sessionId: string
  itemId: string
  selectedOption: number | null
  textAnswer: string | null
  isCorrect: boolean | null
  score: number | null
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
  'id, user_id, session_type, status, section_id, paper_id, current_item_no, elapsed_seconds, time_limit_seconds, started_at, paused_at, completed_at, created_at, updated_at'

const ANSWER_SELECT =
  'id, session_id, item_id, selected_option, text_answer, is_correct, score, time_spent_seconds, answered_at, created_at, updated_at'

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

function toPracticeAnswer(row: AnswerRow): PracticeAnswer {
  return {
    id: row.id,
    sessionId: row.session_id,
    itemId: row.item_id,
    selectedOption: row.selected_option,
    textAnswer: row.text_answer,
    isCorrect: row.is_correct,
    score: row.score,
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
 * - `exam` 会话必须带 `paperId`；`mistake` 二者皆可选。
 * 这里只做参数装配，不重复实现 CHECK 逻辑（数据库是权威），也不会替你猜默认值。
 */
export type CreatePracticeSessionInput = {
  sessionType: PracticeSessionType
  sectionId?: string
  paperId?: string
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
}

/**
 * 查找可恢复（active / paused）会话，供「暂停 / 恢复」使用。
 *
 * ⚠️ 数据库**没有**保证「一个用户同时只有一个 active 会话」的唯一约束，
 * 因此这里返回的是**符合条件中 updated_at 最新的一条**（不是“唯一的那个”），
 * 不伪造任何“最多一个”的业务规则。若无匹配返回 null。
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

  const { data, error } = await query
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new PracticeError(toPracticeErrorMessage(error))
  return data ? toPracticeSession(data) : null
}

/**
 * 更新会话进度 / 状态。只允许改动进度相关列（不整行覆盖 DTO）。
 * `updated_at` 由数据库 `set_updated_at()` 触发器维护，这里不手动写。
 * 返回更新后的会话；会话不存在 / 非本人 → null。
 */
export type PracticeProgressPatch = {
  currentItemNo?: number
  elapsedSeconds?: number
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
