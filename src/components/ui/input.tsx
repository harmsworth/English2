import * as React from 'react'
import { cn } from '@/lib/utils'

function Input({ className, type = 'text', ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // 规格（design-system §8.5）：高 40、radius 8、1px border-strong、surface 底；
        // 占位符用 subtle-foreground（不可用比 muted 更浅的色承载文字）
        'flex h-10 w-full min-w-0 rounded-md border border-border-strong bg-card px-3 py-1 text-sm outline-none transition-[color,box-shadow] placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
