import { animate, m, useMotionValue } from 'motion/react'
import { useIsMobileLayout } from '@/hooks/use-is-mobile-layout'

/**
 * 练习页「可滑动题卡」：motion `drag="x"`（默认监听）做 **1:1 跟手** 横滑切题，
 * AnimatePresence 负责出/入场衔接 —— 提交时旧卡从手指放开的位移处继续滑出、
 * 新卡从对侧滑入，中间无跳变。
 *
 * ⚠️ **两层结构，别合并成一层**（实测踩过，两个坑各需要一层）：
 *
 * | 层 | 负责 | 为什么必须分开 |
 * | --- | --- | --- |
 * | 外层 `m.div` | 出入场滑行（`x: ±100% → 0`），x 由 **motion 自己持有** | `initial` variant 的值**不会写进外部 MotionValue**。合并成一层（`style={{x}}` + variants）时新卡从 0 滑到 0 —— 入场动画静默消失，只剩旧卡滑出，看着就像「新卡凭空出现」。 |
 * | 内层 `m.div` | 拖拽跟手，`x` 是**我们的 MotionValue** | 「抬手没达标 / 撞边界」要 `animate(x, 0, SETTLE)` 手动回位，必须握着这个 MotionValue；交给 motion 持有就拿不到它了。 |
 *
 * 分开还顺带解决了连续性：旧卡退场时内层仍停在手指放开的位移上（-70px 之类），
 * 外层再从 0 滑到 -100%，合成结果就是**从手指离开的地方继续滑出去**，不回弹。
 *
 * ⚠️ 方向由 **AnimatePresence 的 `custom`**（页面传入的 enterFrom）经 variants
 * 函数解析 —— 这是官方轮播（carousel）模式。退出中的旧卡会随 custom 更新重新求值
 * exit variant；若把方向存在卡片自己的 state 里，AnimatePresence 在摘除瞬间快照的
 * 是**旧 props**（exit=undefined），会导致退场动画不播且旧卡悬挂不卸载（实测踩过）。
 * `null` = 跨题跳转：进出场都声明为 0 时长，等效直接换。
 *
 * ⚠️ 为什么不用 `dragListener={false} + useDragControls().start()`：
 * 实测 motion@13.4 该手动路径不生效（拖拽完全不启动），而默认监听路径可靠；
 * 且默认监听自带**输入区豁免**（motion-dom `isElementTextInput`：
 * INPUT/SELECT/TEXTAREA/contentEditable 起手不触发拖拽，button/label 不受影响，
 * radio 圆点只有 ~16px 死区），无需自己写 closest() 门禁。
 *
 * 与 design-direction §9 的对齐：全部 `easeOut` ≤180ms、`dragMomentum={false}`、
 * 边界不对称 constraints + 0.15 橡皮筋 + 过阻尼回位（不回弹）；
 * `reducedMotion="user"` 由外层 MotionConfig 声明。整页横移经用户决策放行。
 *
 * 鼠标与触屏：motion 默认监听不区分 pointerType，桌面鼠标会劫持题卡
 * （并永久 user-select:none）。用 **capture 阶段 stopPropagation** 挡掉 mouse
 * 指针 —— React 合成 capture 挂在 root 容器，早于 motion 在元素上的原生
 * listener，mouse 的 pointerdown 因此到不了拖拽逻辑；touch/pen 放行。
 * 判定不用 `(pointer: coarse)`：Chrome DevTools 设备模拟不改写 pointer 媒体查询，
 * 会在浏览器调试时误判成"完全滑不动"（实测踩过）。
 *
 * **仅移动端布局启用**（用户决策）：滑动与滑入/滑出动画只在 `<768px`
 * （= App 的 `md` 断点，与移动操作条/答题抽屉同一分界线）生效；
 * 桌面布局切题 = 直接换、无动画、不启用 drag（题号栏/按钮导航不需要整程滑行）。
 *
 * ⚠️ **`ref` 必须转发到 `m.div`**（见下面的 props 注释）：不转发会让
 * `mode="popLayout"` 静默失效，新卡被排到旧卡下面再跳上来（实测踩过）。
 */

/** 抬手判定切题的最小横向位移（px）。 */
const COMMIT_DISTANCE = 60
/** 抬手判定切题的最小横向速度（px/s），短促快甩靠它兜底。 */
const FLICK_VELOCITY = 500
/** 出入场时长（s），§9：位移类 ≤180ms。 */
const SLIDE = { duration: 0.18, ease: 'easeOut' } as const
const SETTLE = { duration: 0.15, ease: 'easeOut' } as const
/** 边界橡皮筋的回位调成过阻尼（视觉上无回弹），符合 §9「禁止回弹曲线」。 */
const DRAG_TRANSITION = { bounceStiffness: 1000, bounceDamping: 250 } as const

/** `left` = 手指向左（下一题），`right` = 手指向右（上一题）。 */
export type SwipeCardDirection = 'left' | 'right'

/**
 * 滑动/切题方向（= 新卡的入场侧）：`right` = 看「下一题」从右侧滑入、
 * 旧卡向左滑出；`null` = 跨题号跳转或首屏，直接换不做整程滑行。
 */
export type SwipeCardEnter = 'left' | 'right' | null

/** 进出场变体：桌面布局（!mobile）把方向一律降级为 null = 0 时长直接换。 */
function makeVariants(mobile: boolean) {
  const dirOf = (d: SwipeCardEnter): SwipeCardEnter => (mobile ? d : null)
  return {
    center: { x: 0, transition: SLIDE },
    exit: (d: SwipeCardEnter) => {
      const dir = dirOf(d)
      return dir
        ? { x: dir === 'right' ? '-100%' : '100%', transition: SLIDE }
        : { x: 0, transition: { duration: 0 } }
    },
  }
}

/**
 * 入场起始位移 —— **必须直接给值，不能写成 `initial="enter"` variant**。
 *
 * framer-motion 计算初始状态时走 `makeLatestValues()`，里面是
 * `resolveVariantFromProps(props, name)`：**不传 custom 参数**，于是 variant
 * 函数里的 `d` 落回 `props.custom`，我们没传就是 `undefined` → 解析出 `{x: 0}` →
 * 入场动画**静默消失**（新卡凭空出现，只有旧卡滑走），实测踩过。
 *
 * `exit` 没这个问题：退场走的是动画通路，custom 由 AnimatePresence 的 context 给。
 */
function makeEnterOffset(enter: SwipeCardEnter, mobile: boolean) {
  if (!mobile || !enter) return { x: 0 }
  return { x: enter === 'right' ? '100%' : '-100%' }
}

export function SwipeQuestionCard({
  ref,
  enterFrom,
  canSwipeNext,
  canSwipePrev,
  onCommit,
  onBoundaryHit,
  children,
}: {
  /**
   * ⚠️ **必须转发到底层 `m.div`**，否则切题会「抖一下」：
   *
   * `AnimatePresence mode="popLayout"` 是把旧卡**弹出文档流**来实现无缝换卡的 ——
   * 它 `cloneElement(child, { ref })` 拿到 DOM 节点，`getSnapshotBeforeUpdate` 里
   * 量出 offsetTop/offsetLeft/宽高，再注入一条 `position:absolute` 的 style 规则。
   * 拿不到节点（`ref.current === null`）时这段代码**直接 return，静默跳过**，
   * 于是旧卡继续占着文档流；而 `AnimatePresence` 又是把退场子元素 splice 在
   * 最前面渲染的，新卡就被排到旧卡**下面** —— 用户看到的就是「下一题先在底部
   * 出现，再跑到上面替换前一题」。
   */
  ref?: React.Ref<HTMLDivElement>
  /**
   * 本卡的**入场侧**（= 新题从哪边滑进来）；`null` = 跨题跳转 / 首屏，直接换。
   * 只在挂载那一刻读（决定起始位移），无需与 AnimatePresence 的 custom 同步。
   */
  enterFrom?: SwipeCardEnter
  /** 还能往左滑（非末题） */
  canSwipeNext: boolean
  /** 还能往右滑（非首题） */
  canSwipePrev: boolean
  /** 滑动达标且方向允许：页面切题 */
  onCommit: (direction: SwipeCardDirection) => void
  /** 达标但撞边界：页面弹「已是第一/最后一题」提示 */
  onBoundaryHit: (direction: SwipeCardDirection) => void
  children: React.ReactNode
}) {
  const x = useMotionValue(0)
  /** 滑动与滑行动画仅移动端布局启用（见文件头注释）。 */
  const mobile = useIsMobileLayout()

  /**
   * 不对称约束：被禁方向钉在 0（靠 0.15 弹性给一点"顶墙"行程），
   * 允许方向不给约束 = 完全自由跟手（弹性在无约束轴上不生效）。
   */
  const constraints =
    !canSwipeNext && !canSwipePrev
      ? { left: 0, right: 0 }
      : !canSwipeNext
        ? { left: 0, right: Number.POSITIVE_INFINITY }
        : !canSwipePrev
          ? { left: Number.NEGATIVE_INFINITY, right: 0 }
          : undefined

  return (
    // 外层：只管出入场滑行（x 由 motion 持有，见文件头表格）
    <m.div
      ref={ref}
      className="relative"
      variants={makeVariants(mobile)}
      initial={makeEnterOffset(enterFrom ?? null, mobile)}
      animate="center"
      exit="exit"
      onPointerDownCapture={(event) => {
        if (event.pointerType === 'mouse') event.stopPropagation()
      }}
    >
      {/* 内层：只管拖拽跟手（x 是我们自己的 MotionValue，回位要用） */}
      <m.div
        className="relative touch-pan-y"
        style={{ x }}
        drag={mobile ? 'x' : false}
        dragElastic={0.15}
        dragConstraints={constraints}
        dragMomentum={false}
        dragTransition={DRAG_TRANSITION}
        onDragEnd={(_event, info) => {
          const dir: SwipeCardDirection = info.offset.x < 0 ? 'left' : 'right'
          const crossed =
            dir === 'left'
              ? info.offset.x <= -COMMIT_DISTANCE ||
                info.velocity.x <= -FLICK_VELOCITY
              : info.offset.x >= COMMIT_DISTANCE ||
                info.velocity.x >= FLICK_VELOCITY
          const allowed = dir === 'left' ? canSwipeNext : canSwipePrev

          if (!crossed) {
            animate(x, 0, SETTLE)
            return
          }
          if (!allowed) {
            animate(x, 0, SETTLE)
            onBoundaryHit(dir)
            return
          }
          onCommit(dir)
        }}
      >
        {children}
      </m.div>
    </m.div>
  )
}
