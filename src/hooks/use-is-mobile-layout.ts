import { useSyncExternalStore } from 'react'

/**
 * 是否处于**移动端布局**（`<768px` = App 的 `md` 断点）。
 *
 * 同一条分界线被多处共用（题卡滑动、底部操作条、答题抽屉、设置面板要不要变抽屉），
 * 抽成一处避免各写一份 `matchMedia` 然后漂移。
 *
 * 用 `useSyncExternalStore`（React 官方姿势）而不是「effect 里 setState」：
 * 后者会多一次渲染，转屏 / 改窗口时会闪一下旧布局。
 *
 * ⚠️ 判定**只用宽度**，不要掺 `(pointer: coarse)` —— Chrome DevTools 的设备模拟
 * **不会**改写 pointer 媒体查询，一掺就在浏览器里调试时误判成桌面（实测踩过）。
 */
export function useIsMobileLayout(): boolean {
  const query = '(max-width: 767px)'
  return useSyncExternalStore(
    (onStoreChange) => {
      const mq = window.matchMedia(query)
      mq.addEventListener('change', onStoreChange)
      return () => mq.removeEventListener('change', onStoreChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
