import { cn } from '@/lib/utils'

/**
 * 长文本块（英文原文 / 题干说明等）。
 *
 * - 保留原始换行（题库正文用 \n\n 分段）
 * - 允许任意位置换行，避免长单词或长 URL 撑破页面
 * - 中文参考译文默认折叠，避免与答题内容混淆
 */
export function PassageText({
  text,
  label,
  collapsibleZh,
  className,
}: {
  text: string
  /** 可选的小标题，例如「英文原文」 */
  label?: string
  /** 折叠展示的中文参考（辅助阅读）。不传则不渲染任何中文区域。 */
  collapsibleZh?: string | null
  className?: string
}) {
  const zh = collapsibleZh?.trim()

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {label ? (
        <p className="text-xs font-medium tracking-wide text-muted-foreground">
          {label}
        </p>
      ) : null}

      <div className="whitespace-pre-line wrap-anywhere text-[0.9375rem] leading-7 text-foreground/90">
        {text}
      </div>

      {zh ? (
        <details className="rounded-lg border border-border bg-muted/40 px-4 py-3">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground select-none">
            中文参考（辅助阅读）
          </summary>
          <div className="mt-3 whitespace-pre-line wrap-anywhere text-sm leading-7 text-muted-foreground">
            {zh}
          </div>
        </details>
      ) : null}
    </div>
  )
}
