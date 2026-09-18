import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * 主观题作答输入（翻译 / 写作）。
 * 规格沿用 Input（§8.5）：radius 8、1px border-strong、surface 底；占位符用 subtle-foreground。
 */
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'block w-full resize-y rounded-md border border-border-strong bg-card px-3 py-3 text-[0.9375rem] leading-7 outline-none transition-[color,box-shadow] placeholder:text-subtle-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
