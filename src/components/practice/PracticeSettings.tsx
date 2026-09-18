import { useEffect, useRef, useState } from 'react'
import { Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 练习设置面板（右上齿轮）。
 *
 * 「答题时显示答案」是一个**刻意受控**的开关：
 * - 默认关闭 —— 答案仍然只在提交判分后下发；
 * - 打开后才调用单题答案 RPC（`peek_item_answer`），一次只能看到当前这一题，
 *   不能批量拉取全卷答案。
 * 也就是说它放宽的是"什么时候看"，而不是"能不能批量拿"。
 */
export function PracticeSettings({
  showAnswerImmediately,
  onToggleShowAnswer,
  disabled = false,
}: {
  showAnswerImmediately: boolean
  onToggleShowAnswer: (next: boolean) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label="练习设置"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'inline-flex size-10 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 md:size-9',
          open && 'border-primary-soft-border bg-primary-soft text-primary',
        )}
      >
        <Settings2 aria-hidden="true" className="size-4" strokeWidth={1.5} />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="练习设置"
          className="absolute right-0 z-30 mt-2 w-72 rounded-lg border border-border bg-card p-4 shadow-[0_8px_24px_rgb(26_38_38_/_12%)]"
        >
          <p className="text-[10px] font-bold tracking-[1.2px] text-subtle-foreground uppercase">
            Settings
          </p>

          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">答题时显示答案</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                打开后可边做边看当前这题的答案与解析。关闭则维持原样 ——
                提交判分后才显示。
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={showAnswerImmediately}
              aria-label="答题时显示答案"
              disabled={disabled}
              onClick={() => onToggleShowAnswer(!showAnswerImmediately)}
              className={cn(
                'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
                showAnswerImmediately ? 'bg-primary' : 'bg-border-strong',
              )}
            >
              <span
                className={cn(
                  'inline-block size-5 rounded-full bg-white transition-transform',
                  showAnswerImmediately ? 'translate-x-[22px]' : 'translate-x-0.5',
                )}
              />
            </button>
          </div>

          {disabled ? (
            <p className="mt-3 text-xs text-muted-foreground">
              当前大题没有可显示的答案。
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
