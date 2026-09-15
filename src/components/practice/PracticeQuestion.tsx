import type { ExamItemWithOptions } from '@/services/exams'
import { cn } from '@/lib/utils'

/**
 * 当前题目（presentational，无状态、不碰数据层）。
 * - choice：单选选项，`onSelect` 回传 `option_index`（0-based，与 selected_option 语义一致）。
 * - text（翻译 / 写作等主观题）：按 parse5b §17 显示友好提示，不实现在线作答、不显示任何参考答案。
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
}: {
  item: ExamItemWithOptions
  selectedOption: number | null
  onSelect: (optionIndex: number) => void
}) {
  if (item.item_type !== 'choice') {
    return (
      <div className="rounded-lg border border-border bg-muted/40 px-4 py-4">
        {item.content ? (
          <p className="whitespace-pre-line wrap-anywhere text-[0.9375rem] leading-7 text-foreground/90">
            {item.content}
          </p>
        ) : null}
        <p className="mt-3 text-sm text-muted-foreground">
          本题为主观题，当前练习模式暂不支持在线提交答案。
        </p>
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
