import { useEffect, useRef, useState } from 'react'

/**
 * 练习计时（走表 + 倒计时）。
 *
 * 一个 hook 同时给出「已用」和「剩余」，只跑**一个** interval ——
 * 如果用两个独立的计时器分别算已用与剩余，显示上会差一两秒，看起来像 bug。
 *
 * 播种语义：`initialElapsedSeconds` **只在挂载时**被采纳（恢复会话时接上已累计时长）。
 * 调用方必须保证会话就绪后才挂载本 hook —— 答题页在 `session` 为空时提前 return，
 * 因此挂载时拿到的一定是真实累计值，不需要「0 → N」的二次同步。
 *
 * @param initialElapsedSeconds 会话已累计的秒数
 * @param timeLimitSeconds 时限（秒）；null = 不限时（只做正计时，`remainingSeconds` 为 null）
 * @param running 提交 / 暂停后置 false 停表
 * @param onExpire 到点回调，**只触发一次**
 */
export function usePracticeClock({
  initialElapsedSeconds,
  timeLimitSeconds,
  running,
  onExpire,
}: {
  initialElapsedSeconds: number
  timeLimitSeconds: number | null
  running: boolean
  onExpire: () => void
}) {
  const [ticks, setTicks] = useState(0)

  const elapsedSeconds = initialElapsedSeconds + ticks
  const remainingSeconds =
    timeLimitSeconds === null
      ? null
      : Math.max(0, timeLimitSeconds - elapsedSeconds)
  const expired = remainingSeconds === 0

  useEffect(() => {
    if (!running || expired) return
    const timer = window.setInterval(() => {
      setTicks((value) => value + 1)
    }, 1000)
    return () => {
      window.clearInterval(timer)
    }
  }, [running, expired])

  // 到点只回调一次。回调引用放 ref，避免它变化导致 effect 反复重跑。
  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  const firedRef = useRef(false)
  useEffect(() => {
    if (!expired || !running) return
    if (firedRef.current) return
    firedRef.current = true
    onExpireRef.current()
  }, [expired, running])

  return { elapsedSeconds, remainingSeconds, expired }
}

/** 秒 → `HH:MM:SS`（不足 1 小时也补零，保持等宽数字对齐）。负数按 0 处理。 */
export function formatDuration(totalSeconds: number): string {
  const safe =
    Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}
