import type { PracticeSessionType, PracticeStatus } from '@/services/practice'

/**
 * 「练习记录」的展示口径 —— 首页的未完成提示与记录页共用同一套。
 *
 * 刻意收在这里而不是各处手写：
 * - 会话标题、状态文案、正确率算法、以及「点继续该去哪」都只应有一个定义，
 *   否则首页说「2020 年真题」、记录页说「整卷练习」这种不一致迟早会出现。
 *
 * ⚠️ 这里只有**展示逻辑**，不碰 Supabase、不发请求，也不引入任何答案字段。
 */

/** 展示标题所需的最小字段集（会话 DTO 与统计行都能满足）。 */
export type RecordLike = {
  sessionType: PracticeSessionType
  paperId: string | null
  /** 统计 RPC 会带上试卷年份/标题；直接读会话时为 null，需要靠 `paperNameById` 兜底 */
  paperYear: number | null
  paperTitle: string | null
  /** 单选大题练习的题型 */
  sectionType: string | null
  drillType: string | null
  drillYears: number[] | null
}

/** 年份集合 → 「2020、2021」；空集合回落到空串，交给调用方兜底。 */
function yearsText(years: number[] | null): string {
  if (!years || years.length === 0) return ''
  return [...years].sort((a, b) => a - b).join('、')
}

/**
 * 一次练习的标题。
 *
 * `paperNameById` 是给「直接读会话」的场景用的：会话表只有 paper_id，
 * 没有试卷标题，得靠已经加载过的试卷列表把它翻译成「2020 年真题」。
 */
export function recordTitle(
  record: RecordLike,
  paperNameById?: ReadonlyMap<string, string>,
): string {
  if (record.sessionType === 'exam') {
    if (record.paperYear !== null) return `${record.paperYear} 年真题 · 整卷`
    if (record.paperTitle) return `${record.paperTitle} · 整卷`
    const fromList = record.paperId ? paperNameById?.get(record.paperId) : undefined
    return fromList ? `${fromList} · 整卷` : '整卷练习'
  }

  if (record.sessionType === 'drill') {
    const years = yearsText(record.drillYears)
    const type = record.drillType ?? '题型'
    return years ? `${years} 年 · ${type}` : `${type} 题型练习`
  }

  if (record.sessionType === 'practice') {
    return record.sectionType ? `${record.sectionType} · 单篇练习` : '单篇练习'
  }

  return '错题重做'
}

/** 会话状态 → 中文标签（含颜色语义之外的文字，不靠颜色单独表意）。 */
export function statusLabel(status: PracticeStatus): string {
  if (status === 'active') return '进行中'
  if (status === 'paused') return '已暂停'
  if (status === 'completed') return '已完成'
  return '未作答结束'
}

/**
 * 「继续这次练习」应当跳到哪里。
 *
 * - `exam`   → `/exams/:paperId/practice`
 * - `drill`  → `/drill/:sessionId`（题型练习靠会话 id 定位）
 * - `practice` → **无入口**：单选大题的会话按 CHECK 约束不能存 paper_id
 *   （`practice` 分支要求 `paper_id is null`），而路由需要 paperId。
 *   该路由目前没有 UI 入口，故如实返回 null，不猜一个可能 404 的地址。
 * - `mistake` → 重做入口尚未实现，同样返回 null。
 */
export function resumeTarget(session: {
  id: string
  sessionType: PracticeSessionType
  paperId: string | null
  sectionId: string | null
}): string | null {
  if (session.sessionType === 'exam') {
    return session.paperId ? `/exams/${session.paperId}/practice` : null
  }
  if (session.sessionType === 'drill') return `/drill/${session.id}`
  return null
}

/** 正确率（0–100 的整数）；分母为 0 时返回 null（不显示「0%」这种假数字）。 */
export function accuracyPercent(
  correctCount: number,
  gradedCount: number,
): number | null {
  if (gradedCount <= 0) return null
  return Math.round((correctCount / gradedCount) * 100)
}

/** 记录列表的时间戳文案（本地时区，`YYYY-MM-DD HH:mm`）。 */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 趋势图用的短日期（`MM-DD`）。 */
export function formatShortDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
