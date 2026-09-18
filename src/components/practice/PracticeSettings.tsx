import { useEffect, useRef, useState } from 'react'
import { Settings2 } from 'lucide-react'
import { useIsMobileLayout } from '@/hooks/use-is-mobile-layout'
import { Sheet } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

/**
 * 练习设置面板（右上角齿轮）。
 *
 * 「答题时显示答案」是一个**刻意受控**的开关：
 * - 默认关闭 —— 答案仍然只在提交判分后下发；
 * - 打开后才调用单题答案 RPC（`peek_item_answer`），一次只能看到当前这一题，
 *   不能批量拉取全卷答案。
 * 也就是说它放宽的是"什么时候看"，而不是"能不能批量拿"。
 *
 * ⚠️ **移动端必须换容器**，这是踩过的实测问题：
 * 桌面用的「锚定在按钮右下的 `w-72` 浮层」在 375px 下会被**裁掉一大半** ——
 * 页头 `flex-wrap` 会把「计时 + 齿轮 + 退出」整组换到第二行并左对齐，
 * 齿轮按钮跑到了 x≈102，浮层 `right-0 w-72(288px)` 于是横跨 **-146..142**，
 * 左边 146px 直接出屏（实测数据）。
 * 所以移动端改成**底部抽屉**（复用 `Sheet`，与「答题卡」同一套 §8.14 规格）：
 * 全宽、拇指可及、带遮罩点一下就关、Esc 与焦点陷阱由 Base UI 提供。
 * 桌面保持浮层 —— 那里有横向空间，锚定浮层反而比抽屉更轻。
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
  const mobile = useIsMobileLayout()

  // 浮层的「点外面 / Esc 关闭」只自己实现一份：抽屉那路由 Sheet 的遮罩与 Base UI 负责。
  useEffect(() => {
    if (!open || mobile) return
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
  }, [open, mobile])

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

      {mobile ? (
        <Sheet open={open} onOpenChange={setOpen} title="练习设置">
          <div className="px-5 pt-1 pb-3">
            <h2 className="font-heading text-[17px] font-semibold text-foreground">
              练习设置
            </h2>
          </div>
          <div className="px-5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <SettingsToggleRow
              showAnswerImmediately={showAnswerImmediately}
              onToggleShowAnswer={onToggleShowAnswer}
              disabled={disabled}
            />
            {disabled ? (
              <p className="mt-3 text-xs text-muted-foreground">
                当前大题没有可显示的答案。
              </p>
            ) : null}
          </div>
        </Sheet>
      ) : open ? (
        <div
          role="dialog"
          aria-label="练习设置"
          className="absolute right-0 z-30 mt-2 w-72 rounded-lg border border-border bg-card p-4 shadow-[0_8px_24px_rgb(26_38_38_/_12%)]"
        >
          <p className="text-[10px] font-bold tracking-[1.2px] text-subtle-foreground uppercase">
            Settings
          </p>

          <div className="mt-2">
            <SettingsToggleRow
              showAnswerImmediately={showAnswerImmediately}
              onToggleShowAnswer={onToggleShowAnswer}
              disabled={disabled}
            />
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

/**
 * 「答题时显示答案」开关。
 *
 * **整行可点**（`role="switch"` 挂在这一行的 button 上，右侧的小滑块只是视觉指示、
 * `aria-hidden`）：原来只有 24px 高的滑块本身可点，远低于 §8 的 44px 触控下限，
 * 在移动端很难点中；整行点开后命中区有整块行高，桌面也更顺手。
 *
 * 一个实现同时给浮层和抽屉用 —— 不搞两套布局，省得口径漂移。
 */
function SettingsToggleRow({
  showAnswerImmediately,
  onToggleShowAnswer,
  disabled = false,
}: {
  showAnswerImmediately: boolean
  onToggleShowAnswer: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={showAnswerImmediately}
      aria-label="答题时显示答案"
      disabled={disabled}
      onClick={() => onToggleShowAnswer(!showAnswerImmediately)}
      className={cn(
        'flex w-full items-start justify-between gap-3 rounded-md py-2 text-left outline-none transition-opacity',
        'focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50',
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">
          答题时显示答案
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
          打开后可边做边看当前这题的答案与解析。关闭则维持原样 ——
          提交判分后才显示。
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent transition-colors',
          showAnswerImmediately ? 'bg-primary' : 'bg-border-strong',
        )}
      >
        <span
          className={cn(
            'inline-block size-5 rounded-full bg-white transition-transform',
            showAnswerImmediately ? 'translate-x-[22px]' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  )
}
