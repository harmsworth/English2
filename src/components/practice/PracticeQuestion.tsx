import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import type { ExamItemWithOptions } from '@/services/exams'

/**
 * 当前题目（presentational，无状态、不碰数据层）。
 * - choice：单选选项，`onSelect` 回传 `option_index`（0-based，与 selected_option 语义一致）。
 * - text（翻译 / 写作等主观题）：渲染大输入框，`onTextAnswerChange` 回传输入内容
 *   （由页面防抖写入 `practice_answers.text_answer`）。
 *   「标记已完成作答」仍**只有**传了 `onToggleTextAnswer` 才渲染 —— 那是翻译题
 *   「不写也想看参考译文」的出口，写作题没有参考内容可看，不给这个按钮。
 *
 * 这里**只**使用已安全下发的题目数据（content / options），绝不读取
 * correct_option / explanation / passage_zh 等答案/参考列。
 */

const LETTERS = 'ABCDEFGH'

/** 提前揭示的答案（打开「答题时显示答案」后，由单题 RPC 下发）。 */
export type RevealableAnswer = {
  /** 0-based 正确选项下标；主观题为 null */
  correctOption: number | null
  explanation: string | null
  /** 翻译题参考译文 */
  referenceTranslation: string | null
}

/** 选项标签：题面若自带「A. 」类前缀则原样，否则按 option_index 生成字母。 */
function optionLabel(content: string, optionIndex: number): string {
  if (/^\s*[A-J]\s*[.)]/.test(content)) return content
  const letter = LETTERS[optionIndex] ?? String(optionIndex + 1)
  return `${letter}. ${content}`
}

/** 取选项展示文案（带字母前缀）。 */
function optionText(
  options: ExamItemWithOptions['options'],
  optionIndex: number | null,
): string | null {
  if (optionIndex === null) return null
  const option = options.find((item) => item.option_index === optionIndex)
  return option ? optionLabel(option.content, option.option_index) : null
}

/** 答案揭示块：答题过程中提前看到的内容，视觉上要明显区别于「解析」正文。 */
function RevealedAnswer({
  answer,
  options,
}: {
  answer: RevealableAnswer
  options: ExamItemWithOptions['options']
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

/** 主观题输入框的最小高度：翻译一段 / 写一篇作文都需要足够的书写空间。 */
const TEXTAREA_MIN_HEIGHT = 240

export function PracticeQuestion({
  item,
  selectedOption,
  onSelect,
  isTextAnswered,
  onToggleTextAnswer,
  textAnswer,
  onTextAnswerChange,
  textPlaceholder,
  revealed,
}: {
  item: ExamItemWithOptions
  selectedOption: number | null
  onSelect: (optionIndex: number) => void
  /** 主观题是否已标记「线下完成作答」 */
  isTextAnswered?: boolean
  /** 不传 = 不提供标记能力（页面据此决定这题有没有可查看的参考内容） */
  onToggleTextAnswer?: () => void
  /** 主观题已保存的输入内容（受控值） */
  textAnswer?: string
  /** 主观题输入变更；不传则输入框只读（防止"能打字但存不住"） */
  onTextAnswerChange?: (value: string) => void
  /** 主观题输入框占位文案 */
  textPlaceholder?: string
  /**
   * 答题过程中提前揭示的答案（仅当用户打开「答题时显示答案」时才有值）。
   * 数据来源是单题答案 RPC，不是常规查询 —— 见 services/practice.ts。
   */
  revealed?: RevealableAnswer
}) {
  if (item.item_type !== 'choice') {
    // 只有真的拿到 onToggleTextAnswer 才渲染标记按钮。
    // 否则会变成一个「看着能点、点了没反应」的死按钮 —— 比不渲染更糟。
    const canMark = typeof onToggleTextAnswer === 'function'
    const value = textAnswer ?? ''

    return (
      <div className="flex flex-col gap-4">
        {item.content ? (
          <div className="rounded-lg border border-border bg-card px-5 py-5">
            <p className="whitespace-pre-line wrap-anywhere text-[0.9375rem] leading-7 text-foreground/90">
              {item.content}
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <label
              htmlFor={`text-answer-${item.id}`}
              className="text-sm font-medium text-foreground"
            >
              {canMark ? '我的译文' : '我的作答'}
            </label>
            <span className="text-xs text-muted-foreground tabular-nums">
              {value.length} 字
            </span>
          </div>
          <Textarea
            id={`text-answer-${item.id}`}
            value={value}
            onChange={(event) => onTextAnswerChange?.(event.target.value)}
            readOnly={typeof onTextAnswerChange !== 'function'}
            placeholder={textPlaceholder ?? '在此输入你的作答…'}
            style={{ minHeight: TEXTAREA_MIN_HEIGHT }}
            aria-label={canMark ? '我的译文' : '我的作答'}
          />
        </div>

        {canMark ? (
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              没有写完也可以先标记完成 —— 标记后提交即可看到参考译文。
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant={isTextAnswered ? 'secondary' : 'default'}
                size="sm"
                className="h-9 md:h-7"
                aria-pressed={isTextAnswered === true}
                onClick={onToggleTextAnswer}
              >
                {isTextAnswered ? '✓ 已标记完成（点击可撤销）' : '标记已完成作答'}
              </Button>
              {isTextAnswered ? (
                <span className="text-xs text-primary">
                  已记录作答，提交后可查看参考译文
                </span>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            主观题不判分，作答会被记录下来；提交后可在结果里对照自己的输入。
          </p>
        )}

        {revealed ? (
          <RevealedAnswer answer={revealed} options={item.options} />
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {item.content ? (
        <p className="whitespace-pre-line wrap-anywhere text-[0.9375rem] leading-7 text-foreground/90">
          {item.content}
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-2.5">
        <legend className="sr-only">请选择一个答案</legend>
        {item.options.map((option) => {
          const checked = selectedOption === option.option_index
          return (
            <label
              key={option.id}
              className={cn(
                // §8.8：rest 白底 + border-strong；selected 用 primary-selected 底 + primary ring
                'flex min-h-[56px] cursor-pointer items-start gap-3 rounded-md border px-4 py-3 transition-colors',
                checked
                  ? 'border-primary bg-primary-selected ring-1 ring-primary/40'
                  : 'border-border-strong hover:bg-muted/50',
              )}
            >
              <input
                type="radio"
                name={`item-${item.id}`}
                className="mt-1 size-4 accent-[var(--color-primary)]"
                checked={checked}
                onChange={() => onSelect(option.option_index)}
              />
              <span className="wrap-anywhere text-sm leading-6 text-foreground/90">
                {optionLabel(option.content, option.option_index)}
              </span>
            </label>
          )
        })}
      </fieldset>

      {revealed ? (
        <RevealedAnswer answer={revealed} options={item.options} />
      ) : null}
    </div>
  )
}
