import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { RevealedAnswer, type RevealableAnswer } from '@/components/exams/RevealedAnswer'
import { optionLabel } from '@/lib/option-label'
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
 * 「答案与解析」块的渲染与选项文案口径见 `@/components/exams/RevealedAnswer`
 * 与 `@/lib/option-label`（错题本共用同一套）。
 */

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
          // 揭示答案之后才知道对错：选中项与答案相同 → 绿，不同 → 红
          // （与错题本同一口径，见 MistakeCard）。
          const isCorrect =
            revealed !== undefined && revealed.correctOption === option.option_index
          const isWrongPick =
            revealed !== undefined && checked && !isCorrect
          // 颜色不单独表意（design-system §3.3）：还在答题时勾选只是「已选」，
          // 不能借用对错色，所以未揭示时选中的仍是 primary。
          const tone = isCorrect
            ? 'correct'
            : isWrongPick
              ? 'wrong'
              : checked
                ? 'picked'
                : 'rest'
          return (
            <label
              key={option.id}
              className={cn(
                // §8.8：rest 白底 + border-strong；selected 用 primary-selected 底 + primary ring
                'flex min-h-[56px] cursor-pointer items-start gap-3 rounded-md border px-4 py-3 transition-colors',
                tone === 'correct' &&
                  'border-success bg-success-soft ring-1 ring-success/40',
                tone === 'wrong' &&
                  'border-danger bg-danger-soft ring-1 ring-danger/40',
                tone === 'picked' &&
                  'border-primary bg-primary-selected ring-1 ring-primary/40',
                tone === 'rest' && 'border-border-strong hover:bg-muted/50',
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
              {isCorrect ? (
                <span className="ml-auto shrink-0 text-xs font-medium text-success">
                  正确答案
                </span>
              ) : isWrongPick ? (
                <span className="ml-auto shrink-0 text-xs font-medium text-danger">
                  你选错了
                </span>
              ) : null}
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
