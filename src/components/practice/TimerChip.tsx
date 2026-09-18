import { Clock } from 'lucide-react'
import { COUNTDOWN_WARNING_SECONDS } from '@/lib/constants'
import {
  formatCountdown,
  formatDuration,
} from '@/hooks/use-practice-clock'
import { cn } from '@/lib/utils'

/**
 * 计时胶囊（design-system §8.10）：时钟图标 + 等宽数字。
 *
 * 两种语义都由本组件承担，靠传哪个值区分：
 * - 传 `remainingSeconds`（有限时）→ 显示**剩余**时间，进入最后 5 分钟转警示色；
 * - 只传 `elapsedSeconds`（不限时）→ 显示**已用**时间，primary-soft 常规色。
 *
 * 纯展示；计时状态由 `usePracticeClock` 持有。
 */
export function TimerChip({
  remainingSeconds,
  elapsedSeconds,
}: {
  /** 剩余时间（秒）。有限时的练习传它 */
  remainingSeconds?: number | null
  /** 已用时间（秒）。不限时的练习传它 */
  elapsedSeconds?: number
}) {
  const isCountdown = remainingSeconds !== undefined && remainingSeconds !== null
  const value = isCountdown ? remainingSeconds : (elapsedSeconds ?? 0)
  const isWarning = isCountdown && remainingSeconds <= COUNTDOWN_WARNING_SECONDS
  // 倒计时读「还剩几分钟」，用 MM:SS；正计时仍用 HH:MM:SS（见 formatCountdown 注释）。
  const shown = isCountdown ? formatCountdown(value) : formatDuration(value)

  return (
    <span
      className={cn(
        'inline-flex h-[26px] shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11.5px] font-semibold tabular-nums',
        isWarning
          ? 'bg-danger-soft text-danger'
          : 'bg-primary-soft text-primary',
      )}
    >
      <Clock aria-hidden="true" className="size-4" strokeWidth={1.5} />
      <span
        aria-label={
          isCountdown ? `剩余时间 ${shown}` : `已用时 ${shown}`
        }
      >
        {shown}
      </span>
      {isCountdown ? null : (
        <span className="sr-only">已用时正计时</span>
      )}
    </span>
  )
}
