import { useEffect, useState } from 'react'

/**
 * 练习计时（秒）。
 *
 * 只在客户端自增，不校准服务端时钟 —— 计时用于「我做了多久」的体感反馈，
 * 不是计费或考试倒计时，不需要绝对精确。
 *
 * 播种语义：`initialSeconds` **只在挂载时**作为起点被采纳（恢复会话时接上已累计时长）。
 * 调用方必须保证会话就绪后才挂载本 hook —— 整卷页在 `session` 为空时提前 return，
 * 因此挂载时拿到的一定是真实累计值，不需要「0 → N」的二次同步。
 *
 * @param initialSeconds 会话已累计的秒数
 * @param running 提交 / 暂停后置 false 停表
 */
export function useElapsedSeconds(initialSeconds: number, running = true) {
  const [seconds, setSeconds] = useState(initialSeconds)

  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => {
      setSeconds((value) => value + 1)
    }, 1000)
    return () => {
      window.clearInterval(timer)
    }
  }, [running])

  return seconds
}

/** 秒 → `HH:MM:SS`（不足 1 小时也补零，保持等宽数字对齐）。 */
export function formatDuration(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const seconds = safe % 60
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}
