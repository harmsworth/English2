import { cn } from '@/lib/utils'
import type { ExamItemWithOptions } from '@/services/exams'
import { PassageText } from './PassageText'

/**
 * 主观题（翻译 / 写作）的题面渲染。
 *
 * 这两类小题只有 1 道、`item_type = 'text'`、没有选项；
 * 其 `content` 与组级 `passage`（翻译）或 `prompt`（写作）内容一致，
 * 由大题卡片负责去重，只会渲染一次。
 *
 * 注意：翻译小题的 `extra_data.reference_translation` 是参考答案，
 * 写作的参考范文由大题卡片单独处理，这里一律不碰。
 */
export function TextQuestion({
  item,
  label,
  className,
}: {
  item: ExamItemWithOptions
  label?: string
  className?: string
}) {
  const content = item.content?.trim()
  if (!content) return null

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {label ? (
        <p className="text-xs font-medium tracking-wide text-muted-foreground">
          {label}
        </p>
      ) : null}
      <PassageText text={content} />
    </div>
  )
}
