import { optionLabel } from '@/lib/option-label'
import type { ExamOption } from '@/services/exams'

/**
 * **答案与解析**展示块 —— 练习页（提前揭示）与错题本（按需揭示）共用。
 *
 * 两处的数据来源是同一个受控出口 `peek_item_answer`，DTO 形状也相同
 * （`correctOption` / `explanation` / `referenceTranslation`），所以渲染不该各写一套：
 * 「正确答案 / 解析 / 参考译文」三行的措辞与视觉一旦分叉，用户会以为是两种东西。
 *
 * ⚠️ 本组件只负责**渲染**，不判断「该不该显示答案」——
 * 那是调用方与 service 的职责（练习页要选中选项、错题本要用户点开）。
 */

/** 提前揭示 / 按需揭示的答案（均由单题 RPC 下发，不是常规查询字段）。 */
export type RevealableAnswer = {
  /** 0-based 正确选项下标；主观题为 null */
  correctOption: number | null
  explanation: string | null
  /** 翻译题参考译文 */
  referenceTranslation: string | null
}

/** 取某个选项下标的展示文案（带字母前缀）；取不到该选项时为 null。 */
function optionText(
  options: ExamOption[],
  optionIndex: number | null,
): string | null {
  if (optionIndex === null) return null
  const option = options.find((item) => item.option_index === optionIndex)
  return option ? optionLabel(option.content, option.option_index) : null
}

/** 答案揭示块：视觉上要明显区别于题面正文，一眼能认出「这是答案」。 */
export function RevealedAnswer({
  answer,
  options,
}: {
  answer: RevealableAnswer
  options: ExamOption[]
}) {
  const correct = optionText(options, answer.correctOption)

  return (
    <div className="rounded-lg border border-primary-soft-border bg-primary-soft px-4 py-3">
      <p className="text-[10px] font-bold tracking-[1.2px] text-primary uppercase">
        Answer
      </p>

      {correct ? (
        <p className="mt-2 text-sm font-medium text-foreground">
          正确答案：{correct}
        </p>
      ) : null}

      {answer.explanation ? (
        <p className="mt-2 wrap-anywhere text-sm leading-7 text-muted-foreground">
          {answer.explanation}
        </p>
      ) : null}

      {answer.referenceTranslation ? (
        <p className="mt-2 wrap-anywhere text-sm leading-7 text-muted-foreground">
          {answer.referenceTranslation}
        </p>
      ) : null}

      {!correct && !answer.explanation && !answer.referenceTranslation ? (
        <p className="mt-2 text-sm text-muted-foreground">本题暂无答案内容。</p>
      ) : null}
    </div>
  )
}
