import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { mistakeKeys } from '@/lib/constants'
import {
  listMistakes,
  revealMistakeAnswer,
  updateMistakeStatus,
  type MistakeStatus,
} from '@/services/mistakes'

/**
 * 错题本相关读取 / 写操作（Phase 7 Goal 7.2 / 7.4）。
 *
 * 与其它域一致：Hook 只管 React Query 状态与缓存失效，数据访问全在 mistakes service。
 */

/** 读取当前用户的全部错题（含题面、来源、上次选择）。 */
export function useMistakes() {
  return useQuery({
    queryKey: mistakeKeys.list(),
    queryFn: () => listMistakes(),
  })
}

/**
 * 改错题状态：标记已掌握 / 移出错题本 / 撤销。
 *
 * 成功后失效整棵 `mistakes` 缓存（列表只有一个 key，失效即重取），
 * 让三个筛选视图的数字与卡片位置一次性对齐 —— 不做局部拼装，避免与服务端不一致。
 */
export function useUpdateMistakeStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { mistakeId: string; status: MistakeStatus }) =>
      updateMistakeStatus(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mistakeKeys.all })
    },
  })
}

/**
 * 揭示**一条**错题的答案与解析（用户点开哪张卡就取哪一题）。
 *
 * 用 `useMutation` 而不是 `useQuery`：这是一次由点击触发的命令式动作，
 * 不是「按 key 缓存的列表数据」；结果天然缓存在这条 mutation 的 `data` 里，
 * 卡片重渲染不会重复发请求。
 *
 * 每个卡片各自调用一次，`isPending` / `error` / `data` 才是**按卡片**独立的 ——
 * 若在页面里共享一个实例，点开一张卡会让所有卡同时进 loading。
 *
 * 只读 RPC，不写任何行 ⇒ **不需要**失效任何缓存。
 */
export function useRevealMistakeAnswer() {
  return useMutation({
    mutationFn: (input: { itemId: string }) => revealMistakeAnswer(input),
  })
}
