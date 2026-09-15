import type { Json } from '@/types/database'

/**
 * 读取 `extra_data` / `metadata` 这类 jsonb 字段的窄类型工具。
 *
 * 这些字段是「可选扩展位」：同一列在不同年份/题型下装的键并不一致
 * （例如 `titles` 只有新题型有、`chart_url` 只有 2013/2014 大作文有），
 * 因此一律用运行时收窄读取，缺字段时返回安全默认值，绝不抛错。
 */

function asRecord(source: Json | null | undefined): Record<string, unknown> | null {
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
