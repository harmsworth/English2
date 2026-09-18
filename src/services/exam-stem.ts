import type { ExamSection } from '@/services/exams'
import {
  readBoolean,
  readString,
  readStructuredChart,
  type StructuredChart,
} from '@/components/exams/json-utils'

/**
 * 大题级别的「题干上下文」—— **练习页与错题本共用同一份定义**。
 *
 * 为什么必须有它：一次练习 / 一条错题只显示**一道小题**，而小题题面往往只是一句提问
 * （「According to Paragraph 3…」）—— 原文、写作要求、图表全挂在大题上。
 * 之前展平题目序列时把它们丢了，用户只能对着残句硬猜，这是**设计缺陷**（练习页已修，
 * 错题本同病，两处必须用同一个构造函数，否则口径迟早漂移）。
 *
 * ⚠️ 全部来自**已下发的公开字段**（`intro` / `passage` / `prompt` / `tips`
 * 与大题级 `extra_data` 里的 `chart`），没有新增任何查询，也没放宽答案边界：
 * - 不读 `passage_zh` / `source_data`；
 * - 不读小题级 `extra_data`（翻译参考译文藏在那里）；
 * - 不带 `sample`（参考范文 = 答案，答题时不能看 —— 错题本解析走的是受控 RPC，另说）。
 */
export type ExamStem = {
  /** 大题 id：作为「是否已展开」的键（同一大题内切题保持展开） */
  key: string
  sectionType: string
  sectionTitle: string
  /** 指导语 */
  intro: string | null
  /** 篇章原文（阅读 / 完形 / 翻译） */
  passage: string | null
  /** 题目要求（写作） */
  prompt: string | null
  /** 补充提示（写作要点等） */
  tips: string | null
  /** 结构化图表（写作大作文，承载真实数据） */
  chart: StructuredChart | null
  /** 图表原图地址 */
  chartUrl: string | null
  /** `chart: true` 这类仅有布尔标记、数据未收录的情形 */
  chartFlag: boolean
}

/**
 * 构造题干所需要的**最小字段集**。
 *
 * 刻意不是 `ExamSection`：错题本只嵌入 `exam_sections` 的这几列，
 * 让它去凑 `score` / `minutes` / `sort_order` 只会白白多投影几列。
 * `ExamSection` 本身结构上满足它，所以练习页照旧直接传整个 section。
 */
export type ExamStemSource = Pick<
  ExamSection,
  'id' | 'type' | 'title' | 'intro' | 'passage' | 'prompt' | 'tips' | 'extra_data'
>

/**
 * 大题 → 题干上下文。
 *
 * 空串一律收敛成 `null`：DB 里这类字段常见 `''`，渲染层就不用再判一次。
 */
export function toExamStem(section: ExamStemSource): ExamStem {
  return {
    key: section.id,
    sectionType: section.type,
    sectionTitle: section.title,
    intro: section.intro?.trim() ? section.intro : null,
    passage: section.passage?.trim() ? section.passage : null,
    prompt: section.prompt?.trim() ? section.prompt : null,
    tips: section.tips?.trim() ? section.tips : null,
    chart: readStructuredChart(section.extra_data, 'chart'),
    chartUrl: readString(section.extra_data, 'chart_url'),
    chartFlag: readBoolean(section.extra_data, 'chart') ?? false,
  }
}
