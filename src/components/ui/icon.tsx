import { cloneElement, isValidElement, useId } from 'react'
import type { ComponentType, CSSProperties, ReactElement, ReactNode, SVGProps } from 'react'
import { cn } from '@/lib/utils'

/**
 * 统一图标原语。两种用法，共用一套 color / size / strokeWidth / a11y 归一化：
 *
 * ① 传入图标「组件或元素」（lucide、SVGR 组件等）—— 由 Icon 转发颜色 / 尺寸 / 线宽：
 *     <Icon icon={House} size={20} color="#1F4A45" strokeWidth={1.5} />
 *     <Icon icon={<House />} color="red" />            // 传元素也可
 *     配合数据驱动：const items = [{ icon: House }]; <Icon icon={items[i].icon} />
 *
 * ② 传内联 SVG 节点（原有 children 模式）—— Icon 提供可换色的 <svg> 外壳：
 *     <Icon size={18} color="#1F4A45"><path d="…" /></Icon>
 *
 * 约定：
 * - 颜色走 `currentColor`。模式①把 `color` 透传给图标组件（lucide 的 color 即描边色）；
 *   模式②外壳默认 `stroke="currentColor" / fill="none"`，`color` 通过 CSS `color` 生效。
 *   不传 `color` 则跟随父级文字色（`text-*` token）。
 * - 尺寸 `size`：number 按 px，string 原样；模式②未给时以 `1em` 兜底（可被 Tailwind
 *   `size-*` / button 的 `[&_svg]:size-4` 覆盖），显式给 `size` 时用 `style` 锁定。
 * - 无障碍：传 `title` → 语义图标；否则装饰（`aria-hidden` / `focusable=false`）。
 */

/** 可被 Icon 驱动的图标组件契约：接受 size / color / strokeWidth 等（lucide、SVGR 均满足）。 */
export interface IconRenderProps {
  size?: number | string
  color?: string
  strokeWidth?: number | string
  className?: string
  style?: CSSProperties
  role?: string
  'aria-hidden'?: boolean | 'true' | 'false'
  'aria-label'?: string
}
/** 图标来源：一个图标组件（`House`），或已构造的图标元素（`<House />`）。 */
export type IconSource = ComponentType<IconRenderProps> | ReactElement<IconRenderProps>

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'children' | 'strokeWidth'> {
  /** 模式①：传入图标组件 / 元素。与 children 二选一。 */
  icon?: IconSource
  /** 模式②：内联 SVG 节点（path / circle / rect ……）。 */
  children?: ReactNode
  /** number 按 px，string 原样 CSS 尺寸。 */
  size?: number | string
  /** 颜色（内部 currentColor）。省略则跟随父级文字色。 */
  color?: string
  /** 描边宽度（线宽）。 */
  strokeWidth?: number | string
  /** 视口（仅模式②用到）。默认 24 网格，与 lucide 对齐。 */
  viewBox?: string
  /** 图标可访问名称。省略则为纯装饰。 */
  title?: string
  /** 旋转动画（加载态）。 */
  spin?: boolean
}

function toCssSize(size: number | string): string {
  return typeof size === 'number' ? `${size}px` : size
}

function Icon({
  icon,
  children,
  size,
  color,
  strokeWidth,
  viewBox = '0 0 24 24',
  spin = false,
  className,
  style,
  title,
  width,
  height,
  ...props
}: IconProps) {
  const titleId = useId()
  const mergedClassName = cn(spin && 'animate-spin', className)
  const colorStyle = color ? { color } : null

  // ① 传入图标组件 / 元素：不套外层 <svg>，直接把归一化后的 props 转发给图标本体。
  if (icon) {
    const ariaProps = title
      ? { role: 'img', 'aria-label': title }
      : { 'aria-hidden': true, focusable: false }

    if (isValidElement(icon)) {
      return cloneElement(icon, {
        size,
        color,
        strokeWidth,
        className: mergedClassName,
        style: { ...colorStyle, ...style },
        ...ariaProps,
      })
    }

    const Comp = icon
    return (
      <Comp
        size={size ?? '1em'}
        color={color}
        strokeWidth={strokeWidth}
        className={mergedClassName}
        style={{ ...colorStyle, ...style }}
        {...ariaProps}
      />
    )
  }

  // ② 内联 children：Icon 提供可换色的 <svg> 外壳。
  const hasSize = size !== undefined || width !== undefined || height !== undefined
  const resolvedWidth = size ?? width
  const resolvedHeight = size ?? height
  const dimensionStyle =
    resolvedWidth !== undefined
      ? { width: toCssSize(resolvedWidth), height: toCssSize(resolvedHeight ?? resolvedWidth) }
      : undefined

  return (
    <svg
      data-slot="icon"
      {...(title
        ? { role: 'img', 'aria-labelledby': titleId }
        : { 'aria-hidden': true, focusable: false })}
      viewBox={viewBox}
      width={resolvedWidth ?? '1em'}
      height={resolvedHeight ?? '1em'}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? 2}
      className={mergedClassName}
      style={{ ...colorStyle, ...(hasSize ? dimensionStyle : null), ...style }}
      {...props}
    >
      {title ? <title id={titleId}>{title}</title> : null}
      {children}
    </svg>
  )
}

export { Icon }
