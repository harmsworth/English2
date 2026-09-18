import { useRef } from 'react'

/**
 * 移动端左右滑动手势（整卷练习页用来切题）。
 *
 * 只认「横向位移为主」的滑动：纵向偏移超过 `MAX_OFF_AXIS` 判为页面滚动，不触发切题，
 * 否则在题目区上下滑动时会误翻页。
 */
const THRESHOLD = 60
const MAX_OFF_AXIS = 40

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
}: {
  /** 向左滑 = 下一题 */
  onSwipeLeft?: () => void
  /** 向右滑 = 上一题 */
  onSwipeRight?: () => void
}) {
  const start = useRef<{ x: number; y: number } | null>(null)

  return {
    onTouchStart: (event: React.TouchEvent) => {
      const touch = event.touches[0]
      if (!touch) return
      start.current = { x: touch.clientX, y: touch.clientY }
    },
    onTouchEnd: (event: React.TouchEvent) => {
      const from = start.current
      start.current = null
      if (!from) return
      const touch = event.changedTouches[0]
      if (!touch) return

      const dx = touch.clientX - from.x
      const dy = touch.clientY - from.y
      if (Math.abs(dx) < THRESHOLD) return
      if (Math.abs(dy) > MAX_OFF_AXIS) return

      if (dx < 0) onSwipeLeft?.()
      else onSwipeRight?.()
    },
  }
}
