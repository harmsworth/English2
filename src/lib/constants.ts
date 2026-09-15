/**
 * GitHub 题库源数据目录（Source of Truth）。
 * 注意：不是 content/exams，不要改动。
 */
export const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/harmsworth/English2/main/data/exams'

/**
 * 当前参与同步的题库文件。
 * 新增年份时只在这里追加，例如 'papers-2011.json'。
 */
export const EXAM_FILES = ['papers-2010.json'] as const

export type ExamFileName = (typeof EXAM_FILES)[number]

/** TanStack Query 的 query key 统一入口，避免页面里到处手写字符串 */
export const examKeys = {
  all: ['exams'] as const,
  lists: () => [...examKeys.all, 'list'] as const,
  detail: (paperId: string) => [...examKeys.all, 'detail', paperId] as const,
}
