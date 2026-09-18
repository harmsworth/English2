/**
 * 全局常量。
 *
 * 注意：题库源数据 `data/exams/` 只用于同步 / 校验 / 审计（经 `sync_exam_paper`
 * 写入 Supabase）；运行时前端一律从 Supabase 读取，不再通过 GitHub Raw 拉取，
 * 因此这里不再维护题库文件清单。
 */

/** TanStack Query 的 query key 统一入口，避免页面里到处手写字符串 */
export const examKeys = {
  all: ['exams'] as const,
  lists: () => [...examKeys.all, 'list'] as const,
  detail: (paperId: string) => [...examKeys.all, 'detail', paperId] as const,
  /** 题型练习：按「题型 + 年份」取大题 */
  drill: (type: string, years: readonly number[]) =>
    [...examKeys.all, 'drill', type, [...years].sort((a, b) => a - b).join(',')] as const,
}

/**
 * Practice（练习会话 / 答题）query key 工厂，沿用 examKeys 的集中约定。
 */
export const practiceKeys = {
  all: ['practice'] as const,
  session: (id: string) => [...practiceKeys.all, 'session', id] as const,
  answers: (sessionId: string) =>
    [...practiceKeys.all, 'answers', sessionId] as const,
  resumable: (
    sessionType: string,
    sectionId: string | null,
    paperId: string | null,
    drillKey = '',
  ) =>
    [
      ...practiceKeys.all,
      'resumable',
      sessionType,
      sectionId ?? '',
      paperId ?? '',
      drillKey,
    ] as const,
  /** 未完成（active / paused）会话列表：首页提示 + 记录页顶部 */
  incomplete: () => [...practiceKeys.all, 'incomplete'] as const,
  /** 练习记录（每会话聚合，含判分计数） */
  stats: () => [...practiceKeys.all, 'stats'] as const,
  /** 按题型汇总的正确率 */
  typeAccuracy: () => [...practiceKeys.all, 'type-accuracy'] as const,
}

/**
 * 错题本（mistakes）query key 工厂。
 * 列表以当前用户为界（RLS 已限本人），故不需要把 user id 拼进 key。
 */
export const mistakeKeys = {
  all: ['mistakes'] as const,
  list: () => [...mistakeKeys.all, 'list'] as const,
}

/**
 * 题型练习可选的题型 —— **必须**与数据库 `exam_sections.type` 的实际取值一致
 * （已线上核对：阅读理解 / 完形填空 / 新题型 / 翻译 / 写作）。
 * 顺序按正式考试卷面顺序排列。
 */
export const SECTION_TYPES = [
  '完形填空',
  '阅读理解',
  '新题型',
  '翻译',
  '写作',
] as const

export type SectionType = (typeof SECTION_TYPES)[number]

/** 正式考试时长（考研英语二 = 180 分钟）与全卷客观题量，用于折算各模式的时限。 */
const EXAM_TOTAL_MINUTES = 180
const EXAM_TOTAL_ITEMS = 48

/**
 * 按题量比例折算限时（秒）。
 *
 * 整卷 = 180 分钟（标准考试时长）；其余模式按 `180 分钟 ÷ 48 题` 折算后
 * **向上取整到分钟**，避免出现「3 分 45 秒」这种不像考试的数字。
 * 例如 5 年阅读理解（20 题）= ceil(20 × 3.75) = 75 分钟。
 *
 * 折算规则刻意保持透明可解释：它是「按考试节奏配比」，不是某个官方规定。
 */
export function deriveTimeLimitSeconds(itemCount: number): number {
  if (itemCount <= 0) return EXAM_TOTAL_MINUTES * 60
  if (itemCount === EXAM_TOTAL_ITEMS) return EXAM_TOTAL_MINUTES * 60
  const minutes = Math.ceil((itemCount * EXAM_TOTAL_MINUTES) / EXAM_TOTAL_ITEMS)
  return minutes * 60
}

/** 剩余时间进入警示态的阈值（秒）：少于 5 分钟开始标色提示。 */
export const COUNTDOWN_WARNING_SECONDS = 5 * 60
