import { cn } from '@/lib/utils'
import { Dialog } from '@base-ui/react/dialog'
import type { ReactNode } from 'react'

/**
 * 底部抽屉（design-system §8.14 Sheet）。
 *
 * 基于**已随包安装的** Base UI Dialog 封装，不新增依赖；自动带上
 * `role=dialog` + `aria-modal` + 焦点陷阱 + Esc 关闭 + 背景滚动锁（§8.14 a11y）。
 * 视觉：贴底、顶部 16 圆角 + 拖拽把手 + `rgb(26 38 38 / 40%)` 遮罩，自底部淡入升起。
 *
 * 受控用法（触发口在页面别处，如移动端底部操作条）：
 *   const [open, setOpen] = useState(false)
 *   <Sheet open={open} onOpenChange={setOpen} title="答题卡"> … </Sheet>
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 供屏幕阅读器命名的抽屉标题（视觉上通常另配可见标题）。 */
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange} modal>
      <Dialog.Portal>
        <Dialog.Viewport className="fixed inset-0 z-50 flex justify-center">
          <Dialog.Backdrop className="absolute inset-0 bg-[rgb(26_38_38/0.4)] animate-in fade-in-0 duration-200" />
          <Dialog.Popup
            className={cn(
              'absolute inset-x-0 bottom-0 flex max-h-[80vh] flex-col overflow-hidden',
              'rounded-t-[16px] border-t border-border bg-card',
              'shadow-[0_-8px_24px_rgb(26_38_38/0.12)]',
              'animate-in slide-in-from-bottom-6 duration-250',
              'outline-none',
              className,
            )}
          >
            {/* 拖拽把手（§8.14：36×4 居中），纯装饰 */}
            <span
              aria-hidden="true"
              className="mx-auto mt-2 mb-1 h-1 w-9 shrink-0 rounded-full bg-border"
            />
            <Dialog.Title className="sr-only">{title}</Dialog.Title>
            {description ? (
              <Dialog.Description className="sr-only">{description}</Dialog.Description>
            ) : null}
            {children}
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
