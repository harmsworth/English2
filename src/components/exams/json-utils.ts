import type { Json } from '@/types/database'

/**
 * 读取 `extra_data` / `metadata` 这类 jsonb 字段的窄类型工具。
 *
 * 这些字段是「可选扩展位」：同一列在不同年份/题型下装的键并不一致
 * （例如 `titles` 只有新题型有、`chart_url` 只有 2013/2014 大作文有），
 * 因此一律用运行时收窄读取，缺字段时返回安全默认值，绝不抛错。
 */

function asRecord(source: unknown): Record<string, unknown> | null {
  if (source === null || source === undefined) return null
  if (typeof source !== 'object' || Array.isArray(source)) return null
  return source as Record<string, unknown>
}

/** 读取字符串字段；非字符串或空串返回 null。 */
export function readString(
  source: Json | null | undefined,
  key: string,
): string | null {
  const value = asRecord(source)?.[key]
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed === '' ? null : value
}

/** 读取布尔字段；非布尔返回 null（便于用 `??` 逐级兜底）。 */
export function readBoolean(
  source: Json | null | undefined,
  key: string,
): boolean | null {
  const value = asRecord(source)?.[key]
  return typeof value === 'boolean' ? value : null
}

/** 读取字符串数组；非数组返回空数组，数组内的非字符串元素被丢弃。 */
export function readStringArray(
  source: Json | null | undefined,
  key: string,
): string[] {
  const value = asRecord(source)?.[key]
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

/** 结构化图表的一个数据项：标签 + 数值。 */
export type ChartItem = {
  label: string
  value: number
}

/**
 * 结构化图表（写作大作文的「数据型」图表）。
 *
 * 与只表示「本题是图表作文」的布尔型 `chart: true` 不同，这里承载真实数据。
 */
export type StructuredChart = {
  type: string
  unit: string
  title: string
  items: ChartItem[]
}

/**
 * 读取结构化图表字段。
 *
 * 真实题库里 `chart` 有三种形态：
 * - `true` / `false`：旧的布尔标记（如 2013 / 2014、2026）→ 本函数返回 null，
 *   由调用方继续用 `readBoolean` 走原有分支；
 * - 对象 `{ type, unit, title, items[] }`：结构化图表（2024 / 2025 写作 B）→ 解析返回；
 * - 缺失或其它值 → 返回 null。
 *
 * 判定标准（宁可不渲染，也不让脏数据把详情页搞崩）：
 * `items` 必须是**非空数组**，且每一项都同时具备字符串 `label` 与有限数字 `value`；
 * 任一不满足即整体返回 null。`type` / `unit` / `title` 只是展示性标签，缺失时给安全默认值。
 */
export function readStructuredChart(
  source: Json | null | undefined,
  key: string,
): StructuredChart | null {
  const chart = asRecord(asRecord(source)?.[key])
  if (chart === null) return null

  const rawItems = chart['items']
  if (!Array.isArray(rawItems) || rawItems.length === 0) return null

  const items: ChartItem[] = []
  for (const rawItem of rawItems) {
    const entry = asRecord(rawItem)
    if (entry === null) return null

    const label = entry['label']
    const value = entry['value']
    if (
      typeof label !== 'string' ||
      typeof value !== 'number' ||
      !Number.isFinite(value)
    ) {
      return null
    }

    items.push({ label, value })
  }

  const type = chart['type']
  const unit = chart['unit']
  const title = chart['title']

  return {
    type: typeof type === 'string' && type !== '' ? type : 'bar',
    unit: typeof unit === 'string' ? unit : '',
    title: typeof title === 'string' ? title : '',
    items,
  }
}
