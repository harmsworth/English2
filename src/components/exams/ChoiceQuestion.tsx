import { cn } from '@/lib/utils'
import type { ExamItemWithOptions } from '@/services/exams'

/** 选项序号：A、B、C…（题库最多 7 项，超出字母范围退回数字）。 */
function optionLetter(optionIndex: number): string {
  return optionIndex >= 0 && optionIndex < 26
    ? String.fromCharCode(65 + optionIndex)
    : String(optionIndex + 1)
}

/**
 * 文本自带的序号字母。
 *
 * 部分年份的选项/标题自带前缀（2011 新题型 `A. "fat taxes" …`、
 * 2010 新题型 `T. True`），另一些年份没有（2013 新题型、完形填空选项）。
 * 取到自带字母时优先用它，保证「可选：」列表与大题卡片的标题池
 * 用的是同一套字母（2010 → T / F，2026 → A…G）。
 */
function ownLetter(content: string): string | null {
  const matched = /^\s*([A-Z])[.、]\s/.exec(content)
  return matched?.[1] ?? null
}

/** 选项的展示字母：优先用文本自带字母，否则按 `option_index` 换算。 */
function displayLetter(optionIndex: number, content: string): string {
  return ownLetter(content) ?? optionLetter(optionIndex)
}

/** 题干自带的行首编号（如 2026 新题型的 `41. …`），没有则为 null。 */
function leadingNumber(content: string): number | null {
  const digits = /^\s*(\d+)\s*[.、)]/.exec(content)?.[1]
  return digits === undefined ? null : Number(digits)
}

/** 选项 / 备选标题的一行：左侧序号 + 文本 */
function LabeledLine({
  index,
  content,
  className,
}: {
  index: number
  content: string
  className?: string
}) {
  return (
    <li
      className={cn(
        'flex gap-2.5 text-[0.9375rem] leading-7 text-foreground/85',
        className,
      )}
    >
      {ownLetter(content) ? null : (
        <span className="w-5 shrink-0 font-medium text-muted-foreground">
          {optionLetter(index)}.
        </span>
      )}
      <span className="wrap-anywhere">{content}</span>
    </li>
  )
}

/**
 * 选择题（阅读理解 / 完形填空 / 新题型）。
 *
 * 只渲染题干与选项，**不渲染** `correct_option` 与 `explanation`：
 * 正确项下标会随查询回到前端，但本阶段页面一律不展示答案。
 *
 * `letterOnly`：新题型的 5 道小题共用同一份备选标题池，池子由大题卡片
 * 统一展示（见 `TitlePool`），小题只列出可选字母，避免同一份标题重复 5 遍。
 */
export function ChoiceQuestion({
  item,
  letterOnly = false,
  className,
}: {
  item: ExamItemWithOptions
  letterOnly?: boolean
  className?: string
}) {
  const { options } = item

  // 题干自带编号且与小题序号不一致时（如 2026 新题型的 41–45），
  // 直接沿用题干里的编号；这里只把序号徽标隐藏，但**保留列宽**，
  // 否则同一张大题里的题干会左右错位
  const own = leadingNumber(item.content ?? '')
  const showBadge = own === null || own === item.item_no

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex gap-3">
        <span
          aria-hidden={showBadge ? undefined : true}
          className={cn(
            'mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground tabular-nums',
            showBadge ? null : 'invisible',
          )}
        >
          {showBadge ? item.item_no : null}
        </span>
        <p className="whitespace-pre-line wrap-anywhere text-[0.9375rem] leading-7">
          {item.content}
        </p>
      </div>

      {options.length === 0 ? (
        <p className="pl-9 text-sm text-muted-foreground">本题未收录选项。</p>
      ) : letterOnly ? (
        <p className="pl-9 text-sm text-muted-foreground">
          可选：
          {options
            .map((option) => displayLetter(option.option_index, option.content))
            .join(' / ')}
        </p>
      ) : (
        <ul className="flex list-none flex-col gap-1.5 pl-9">
          {options.map((option) => (
            <LabeledLine
              key={option.id}
              index={option.option_index}
              content={option.content}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * 备选标题池（新题型专用）。
 *
 * 新题型的小题内容是待匹配的陈述句，真正的备选内容在标题池里，
 * 因此池子按 `extra_data.titles` 渲染一次，字母与小题的
 * `option_index` 一一对应。
 */
export function TitlePool({
  titles,
  className,
}: {
  titles: string[]
  className?: string
}) {
  if (titles.length === 0) return null

  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-muted/40 px-4 py-3',
        className,
      )}
    >
      <p className="text-xs font-medium tracking-wide text-muted-foreground">
        备选标题
      </p>
      <ul className="mt-3 flex list-none flex-col gap-1.5">
        {titles.map((title, index) => (
          <LabeledLine key={index} index={index} content={title} />
        ))}
      </ul>
    </div>
  )
}
