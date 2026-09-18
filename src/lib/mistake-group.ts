import type { ExamStem } from '@/services/exam-stem'
import type { MistakeItem } from '@/services/mistakes'

/**
 * 把错题按**大题**归组，让同一篇阅读 / 同一个写作题的题干只渲染一次。
 *
 * 为什么需要：错题是**题目级**的（`mistakes` 一题一行），而题干是**大题级**的 ——
 * 一篇阅读的 5 道错题共用一段原文。每张卡片各渲染一遍题干，就是把同一段两千多字
 * 的原文重复 5 遍（用户报障：「题干相同却重复显示」）。
 *
 * ⚠️ 分组必须在**筛选之后**做：先按状态 / 年份 / 题型筛掉一部分，剩下的才谈得上
 * 分组，否则会留下「组里一道题都没有」的空壳（页面的调用顺序因此不能颠倒）。
 *
 * 顺序：输入已经是 `last_wrong_at` 倒序，所以「最近错的那道题」所在的组排在最前，
 * 组内也保持同样的顺序 —— 这里**不再重排**，避免和列表口径分叉。
 */
export type MistakeSectionGrouping = {
  /** 大题 id（`stem.key`）；大题行读不到时统一是 `'unknown'` */
  key: string
  /** 组头文案，如「2016 年真题 · 阅读理解」 */
  label: string
  /** 大题题干；`null` 表示这道题拿不到大题上下文，组头只显示 label */
  stem: ExamStem | null
  /** 组内错题，顺序与输入一致（最近错的在前） */
  items: MistakeItem[]
}

export function groupMistakesBySection(
  mistakes: readonly MistakeItem[],
): MistakeSectionGrouping[] {
  const byKey = new Map<string, MistakeSectionGrouping>()

  for (const mistake of mistakes) {
    // 大题缺席时不臆造 key：全部并进一个「来源未知」组，
    // 比按 paperId 拆成一堆单题组更容易一眼看出是数据问题。
    const key = mistake.stem?.key ?? 'unknown'
    const existing = byKey.get(key)
    if (existing) {
      existing.items.push(mistake)
      continue
    }
    // Map 保留插入顺序：组的位置由组内**第一道**错题（即最近错的那道）决定。
    byKey.set(key, {
      key,
      label: sourceLabel(mistake),
      stem: mistake.stem,
      items: [mistake],
    })
  }

  return [...byKey.values()]
}

/** 组头文案：年份（缺则退回试卷标题）+ 大题标题（缺则退回题型）。 */
function sourceLabel(mistake: MistakeItem): string {
  const exam =
    mistake.paperYear !== null ? `${mistake.paperYear} 年真题` : mistake.paperTitle
  const section = mistake.sectionTitle ?? mistake.sectionType
  const parts = [exam, section].filter((part): part is string => Boolean(part))
  return parts.join(' · ') || '来源未知'
}
