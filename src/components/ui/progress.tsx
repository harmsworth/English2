import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * 进度条（design-system §8.4）：轨道 6px + 主色填充 + 右侧百分比（tabular-nums）。
 * 之前 `ExamListPage` 若有进度展示是各写各的内联实现，统一到这里以便复用与无障碍。
 */
function Progress({
  className,
  value = 0,
  max = 100,
  showValue = false,
  label,
  ...props
}: React.ComponentProps<'div'> & {
  value?: number
  max?: number
  showValue?: boolean
  label?: string
}) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100))

  return (
    <div
      className={cn('flex items-center gap-2', className)}
      {...props}
    >
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? '进度'}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-track"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      {showValue ? (
        <span className="text-[11px] font-semibold text-muted-foreground tabular-nums">
          {Math.round(pct)}%
        </span>
      ) : null}
    </div>
  )
}

export { Progress }
