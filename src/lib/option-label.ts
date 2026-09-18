/**
 * 选项文案口径（纯函数，无 React 依赖）。
 *
 * 单独成文件而不是塞在组件里，原因有二：
 * 1. 题库选项的序号前缀在**详情页 / 练习页 / 错题本**三处都要判断，
 *    实现分散就会分叉 —— 例如「题面自带 `A. ` 时不要再补一个 A」这条规则，
 *    已经出现过两份不同正则的写法；
 * 2. 组件文件只导出组件（`react/only-export-components`），
 *    混着导出工具函数会破坏 Fast Refresh。
 */

const LETTERS = 'ABCDEFGH'

/** 选项序号：A、B、C…（题库最多 7 项，超出字母范围退回数字）。 */
export function optionLetter(optionIndex: number): string {
  return LETTERS[optionIndex] ?? String(optionIndex + 1)
}

/**
 * 题面是否**自带**序号字母（部分年份写作 / 新题型自带 `A. ` `A、` `A)` 前缀）。
 *
 * 自带就不再补一遍，否则会出现「A. A. xxx」。
 */
export function hasOwnOptionLetter(content: string): boolean {
  return /^\s*[A-Z]\s*[.、)]/.test(content)
}

/** 选项展示文案：自带字母则原样，否则补上「A. 」前缀。 */
export function optionLabel(content: string, optionIndex: number): string {
  return hasOwnOptionLetter(content) ? content : `${optionLetter(optionIndex)}. ${content}`
}
