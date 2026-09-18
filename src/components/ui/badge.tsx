import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

/**
 * 状态徽章（design-system §8.3）。
 *
 * 全站状态的唯一实现 —— 之前 `MistakeCard` / `ExamListPage` 各写一份内联样式，
 * 且用 `bg-destructive/10` 这类「透明度叠色」写法，换主色后就要整体重调。
 *
 * ⚠️ 必须带文字：描边与底色的对比度远低于 3:1，「只靠颜色」传达状态不合规（§3.3）。
 * 色值已按 WCAG AA 实测修正（muted / success / warning 三处，见 design-system §3.3）。
 */
const badgeVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-[4px] border border-transparent font-sans font-bold whitespace-nowrap',
  {
    variants: {
      variant: {
        neutral: 'bg-neutral-soft text-neutral-soft-foreground',
        warning: 'bg-warning-soft text-warning',
        success: 'bg-success-soft text-success',
        danger: 'bg-danger-soft text-danger',
        primary: 'bg-primary-soft text-primary border-primary-soft-border',
      },
      size: {
        /** 拉丁短标签（CORRECT / YOURS） */
        sm: 'h-[19px] gap-1 px-2 text-[10px] tracking-[0.2px]',
        /** 中文标签，字号保证可读 */
        md: 'h-[22px] gap-1 px-2 text-[11px] tracking-[0.1px]',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'md',
    },
  }
)

function Badge({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
