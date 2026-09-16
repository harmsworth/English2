import type { ExamItemWithOptions } from '@/services/exams'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * 当前题目（presentational，无状态、不碰数据层）。
 * - choice：单选选项，`onSelect` 回传 `option_index`（0-based，与 selected_option 语义一致）。
 * - text（翻译 / 写作等主观题）：**只有**传了 `onToggleTextAnswer` 才渲染「标记已完成作答」，
 *   由页面决定要不要给（目前只有翻译题给）。提交后参考译文由判分 RPC 受控下发。
 *
 * 这里**只**使用已安全下发的题目数据（content / options），绝不读取
 * correct_option / explanation / passage_zh 等答案/参考列。
 */

const LETTERS = 'ABCDEFGH'

/** 选项标签：题面若自带「A. 」类前缀则原样，否则按 option_index 生成字母。 */
function optionLabel(content: string, optionIndex: number): string {
  if (/^\s*[A-J]\s*[.)]/.test(content)) return content
  const letter = LETTERS[optionIndex] ?? String(optionIndex + 1)
  return `${letter}. ${content}`
}

export function PracticeQuestion({
  item,
  selectedOption,
  onSelect,
  isTextAnswered,
  onToggleTextAnswer,
}: {
  item: ExamItemWithOptions
  selectedOption: number | null
  onSelect: (optionIndex: number) => void
  /** 主观题是否已标记「线下完成作答」 */
  isTextAnswered?: boolean
  /** 不传 = 不提供标记能力（页面据此决定这题有没有可查看的参考内容） */
  onToggleTextAnswer?: () => void
}) {
  if (item.item_type !== 'choice') {
    // 只有真的拿到 onToggleTextAnswer 才渲染标记按钮。
    // 否则会变成一个「看着能点、点了没反应」的死按钮 —— 比不渲染更糟。
    const canMark = typeof onToggleTextAnswer === 'function'

    return (
      <div className="flex flex-col gap-4">
        {item.content ? (
          <div className="rounded-xl border border-border bg-card px-5 py-5">
            <p className="whitespace-pre-line wrap-anywhere text-[0.9375rem] leading-7 text-foreground/90">
              {item.content}
            </p>
          </div>
        ) : null}

        <div className="rounded-xl border border-border bg-muted/40 px-5 py-4">
          <p className="text-sm font-medium text-foreground">主观题作答说明</p>

          {canMark ? (
            <>
              <p className="mt-1 text-sm text-muted-foreground">
                本题为主观题，建议在线下或草稿纸上完成作答。完成后点下方按钮确认，
                提交后即可看到参考译文。
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant={isTextAnswered ? 'secondary' : 'default'}
                  size="sm"
                  aria-pressed={isTextAnswered === true}
                  onClick={onToggleTextAnswer}
                >
                  {isTextAnswered ? '✓ 已标记完成（点击可撤销）' : '标记已完成作答'}
                </Button>
                {isTextAnswered ? (
                  <span className="text-xs text-primary">
                    已记录作答，可点击下方「提交并查看结果」查看参考译文
                  </span>
                ) : null}
              </div>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              本题为主观题，练习模式不采集在线作答；写作题若有参考范文，
              可在试卷详情页展开查看。
            </p>
          )}
        </div>
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
                'flex cursor-pointer items-start gap-3 rounded-xl border border-border px-4 py-3 transition-colors',
                checked
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/40'
                  : 'hover:bg-muted/50',
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
    </div>
  )
}
