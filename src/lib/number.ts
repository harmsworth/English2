/**
 * 数值聚合工具。
 *
 * 起因：`reduce((total, x) => total + x, 0)` 这种「求和」在项目里散落了 5 处
 * （试卷小题数、记录页的累计用时 / 判分题数 / 答对数、题型练习的预览题量）。
 * 抽到这里的目的不只是去重，更重要的是把**精度口径**收敛到一个地方说明：
 * 求和到底安不安全，取决于被加的数是什么类型，而不是取决于写法。
 *
 * ⚠️ 这里只做纯函数计算，不碰 Supabase、不碰 DOM。
 */

/**
 * 求和。**适用于整数**（题数、秒数、计数等）。
 *
 * JS 的 number 是 IEEE-754 双精度浮点：只要参与运算的每个数及其部分和都是
 * **安全整数**（|n| ≤ 2^53−1 ≈ 9×10^15），加减法就是**精确**的，
 * 不存在精度问题 —— 项目里的题数、用时秒数、判分计数全部落在这个范围。
 *
 * ❗ 反过来，只要被加的数带小数（题分、金额、比率），就别用这个函数，
 * 用 `sumPrecise()`（见下）。
 */
export function sum(values: readonly number[]): number {
  let total = 0
  for (const value of values) total += value
  return total
}

/**
 * 按字段求和。`sumBy(rows, (row) => row.count)` ≡ `sum(rows.map(pick))`，
 * 但少一次中间数组分配。
 */
export function sumBy<T>(items: readonly T[], pick: (item: T) => number): number {
  let total = 0
  for (const item of items) total += pick(item)
  return total
}

/**
 * **定点求和**：用于小数（题分、金额、百分比）这类不能出现浮点尾差的量。
 *
 * 为什么需要它：`0.1 + 0.2 !== 0.3`（而是 0.30000000000000004）。
 * 小数在二进制里多数无法精确表示，逐个相加会把误差累积起来，
 * 最终表现为「界面上算出 9.999999999999998 分」这种脏数据。
 *
 * 做法是经典的「放大成整数 → 求和 → 缩回」：
 * 先按 `decimals` 把每个数四舍五入到整数（如 2 位小数 → ×100），
 * 整数区间内求和是精确的，最后一次除法把量纲还原。
 *
 * @param decimals 参与运算的小数位数（默认 2，对应「分」；题分场景传 1）
 *
 * ⚠️ 前置假设：每个元素本身的小数位**不超过** `decimals`。
 * 传入 1.005 这类「按十进制看是 3 位、二进制又不精确」的值时，
 * `Math.round(1.005 * 100)` 可能得到 100 而非 101 —— 这是调用方该在**入库前**
 * 就归一化的问题，不是本函数应该猜的事。
 *
 * 💡 需要任意精度（大额金额、乘除混合）时，正确做法是引入 `decimal.js` /
 * `big.js`，或干脆把金额存成**整数最小单位**（分）—— 而不是继续加补偿项。
 * 当前项目所有求和都是整数，故未引入任何依赖。
 */
export function sumPrecise(values: readonly number[], decimals = 2): number {
  const factor = 10 ** decimals
  let total = 0
  for (const value of values) total += Math.round(value * factor)
  return total / factor
}

/**
 * 定点四舍五入到指定小数位。
 *
 * 比 `Number(value.toFixed(d))` 更适合参与后续运算：`toFixed` 返回字符串，
 * 而 `Math.round(value * 10**d) / 10**d` 得到的仍是 number。
 * 加 `Number.EPSILON` 是为了修正 `Math.round(1.005 * 100)` 这类
 * 「乘法先把值压到略小于中点」的边界情形。
 */
export function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}
