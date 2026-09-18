import type { StructuredChart } from './json-utils'

/**
 * 写作大作文的图表（详情页与**答题页题干**共用）。
 *
 * 抽出来的原因：答题页现在也要显示大题题干，而大作文没有图表根本没法写 ——
 * 两处各写一份渲染逻辑，迟早会出现「详情页改了、答题页没改」的漂移。
 *
 * ⚠️ 入参一律是**已解析好的值**，本组件不再接触 `extra_data`：
 * `extra_data` 里还装着 `sample`（参考范文），答题时绝不能顺手渲染出来。
 */

/** 图表类型的展示名；未知类型回退为原始值。 */
const CHART_TYPE_LABELS: Record<string, string> = {
  bar: '柱状图',
  line: '折线图',
  pie: '饼图',
}

export function ChartFigure({
  chart,
  chartUrl,
  chartFlag,
  alt,
}: {
  /** 结构化图表（承载真实数据）；布尔型 / 缺失时为 null */
  chart: StructuredChart | null
  /** 图表图片地址（部分年份只有原图） */
  chartUrl: string | null
  /** `chart: true` 这类「本题是图表作文」的布尔标记（数据未收录时的兜底提示） */
  chartFlag: boolean
  /** 图片的替代文本 */
  alt: string
}) {
  if (chart) {
    // 条形宽度按各数据项相对最大值换算；设下限 1 避免全 0 时除零。
    const chartMax = Math.max(1, ...chart.items.map((item) => item.value))

    return (
      <figure className="rounded-lg border border-border bg-muted/40 px-4 py-4">
        <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <span className="text-xs font-medium tracking-wide text-muted-foreground">
            {chart.title || '图表'}
          </span>
          <span className="text-xs text-muted-foreground">
            {CHART_TYPE_LABELS[chart.type] ?? chart.type}
            {chart.unit ? ` · 单位：${chart.unit}` : ''}
          </span>
        </figcaption>

        <ul className="mt-3 flex flex-col gap-2.5">
          {chart.items.map((item, itemIndex) => (
            <li
              key={`${item.label}-${itemIndex}`}
              className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3"
            >
              <span
                className="truncate text-sm text-foreground/90"
                title={item.label}
              >
                {item.label}
              </span>
              <span className="h-2 overflow-hidden rounded-full bg-border">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${(item.value / chartMax) * 100}%` }}
                />
              </span>
              <span className="text-sm tabular-nums text-muted-foreground">
                {item.value}
                {chart.unit}
              </span>
            </li>
          ))}
        </ul>
      </figure>
    )
  }

  if (chartUrl) {
    return (
      <figure className="flex min-h-48 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40">
        <img
          src={chartUrl}
          alt={alt}
          loading="lazy"
          className="block h-auto w-full"
        />
      </figure>
    )
  }

  if (chartFlag) {
    return (
      <p className="text-xs text-muted-foreground">
        本题为图表作文，图表原图尚未收录。
      </p>
    )
  }

  return null
}
