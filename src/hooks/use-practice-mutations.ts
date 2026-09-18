import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { mistakeKeys, practiceKeys } from '@/lib/constants'
import {
  createPracticeSession,
  deletePracticeAnswer,
  gradePracticeSection,
  savePracticeAnswerDrafts,
  updatePracticeSessionProgress,
  upsertPracticeAnswer,
  type CreatePracticeSessionInput,
  type PracticeAnswerDraft,
  type PracticeProgressPatch,
  type UpsertPracticeAnswerInput,
} from '@/services/practice'

/** 批量保存作答的入参。 */
export type SavePracticeAnswerDraftsInput = {
  sessionId: string
  upserts: PracticeAnswerDraft[]
  deletes: string[]
}

/**
 * Practice 相关写操作（TanStack Query mutation）。
 *
 * 与查询一样，Hook 只负责缓存失效与请求状态，实际写库全在 practice service。
 */

/**
 * 让「首页未完成提示 / 记录页统计」这三条派生于会话的查询失效。
 *
 * 它们不在某条 session 缓存的下游 —— `invalidateQueries` 是前缀匹配，
 * 只失效 `['practice','session',id]` 不会带动 `['practice','stats']`。
 * 提交判分 / 暂停退出 / 结束时必须显式点名，否则记录页会停在旧数字上。
 */
function invalidatePracticeAggregates(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: practiceKeys.incomplete() })
  void queryClient.invalidateQueries({ queryKey: practiceKeys.stats() })
  void queryClient.invalidateQueries({ queryKey: practiceKeys.typeAccuracy() })
}

/** 开始一次练习会话。成功后刷新 practice 相关缓存（新会话可被 resumable 查询到）。 */
export function useCreatePracticeSession() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreatePracticeSessionInput) =>
      createPracticeSession(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: practiceKeys.all })
    },
  })
}

/** 保存会话进度 / 暂停 / 恢复 / 完成。成功后刷新该会话缓存。 */
export function useUpdatePracticeSessionProgress() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; patch: PracticeProgressPatch }) =>
      updatePracticeSessionProgress(args.id, args.patch),
    onSuccess: (session) => {
      if (session) {
        queryClient.invalidateQueries({
          queryKey: practiceKeys.session(session.id),
        })
      }
      // 暂停 / 完成 / 放弃都会改变「未完成」集合与记录页的用时与状态。
      invalidatePracticeAggregates(queryClient)
    },
  })
}

/**
 * 提交并判分整个大题（Phase 6 Goal 6.1）。
 *
 * 成功后刷新该会话、其作答缓存，以及**错题本** —— 会话会变成 `completed`，
 * `practice_answers.is_correct` 由服务端写回（前端不回写），
 * 同时 RPC 会把本次答错的客观题 upsert 进 `mistakes`。
 */
export function useGradePracticeSection() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => gradePracticeSection(sessionId),
    onSuccess: (_results, sessionId) => {
      queryClient.invalidateQueries({
        queryKey: practiceKeys.session(sessionId),
      })
      queryClient.invalidateQueries({
        queryKey: practiceKeys.answers(sessionId),
      })
      // 判分写回了 is_correct 并推进会话到 completed —— 统计口径变了。
      invalidatePracticeAggregates(queryClient)
      // ⚠️ 错题本必须一起失效，否则「提交完点错题本还是旧列表」。
      // 判分 RPC 内部会 upsert `mistakes`，那是**另一个域**的缓存，
      // 且全局 staleTime 是 5 分钟：不点名失效，切过去时缓存仍算「新鲜」，
      // 不会重新取数，用户只能手动刷新页面才看到新错题。
      queryClient.invalidateQueries({ queryKey: mistakeKeys.all })
    },
  })
}

/**
 * ⚠️ 单题即时写库 —— **答题流程已不再使用**。
 *
 * 「点一下发好几个请求」正是它造成的：每次选择都打一次网络，`onSuccess` 又会失效
 * 会话 + 作答两处缓存、引发链式重取。答题页现在的**唯一**写入口是
 * `useSavePracticeAnswerDrafts()`（退出 / 提交时批量落库）。
 * 保留它只是作为底层原语；**答题页禁止再引入**，否则该问题会立刻回归。
 */
export function useUpsertPracticeAnswer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpsertPracticeAnswerInput) => upsertPracticeAnswer(input),
    onSuccess: (answer) => {
      queryClient.invalidateQueries({
        queryKey: practiceKeys.session(answer.sessionId),
      })
      queryClient.invalidateQueries({
        queryKey: practiceKeys.answers(answer.sessionId),
      })
    },
  })
}

/**
 * ⚠️ 单题即时删除 —— **答题流程已不再使用**（同 `useUpsertPracticeAnswer`）。
 *
 * 撤销翻译题标记现在在本地记成「待删除」，随 `useSavePracticeAnswerDrafts()` 一起落库。
 *
 * 行被真删之后，该题重新回到「未作答」，因此也不会再出现在判分结果里。
 */
export function useDeletePracticeAnswer() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { sessionId: string; itemId: string }) =>
      deletePracticeAnswer(input),
    onSuccess: (_void, input) => {
      queryClient.invalidateQueries({
        queryKey: practiceKeys.session(input.sessionId),
      })
      queryClient.invalidateQueries({
        queryKey: practiceKeys.answers(input.sessionId),
      })
    },
  })
}

/**
 * 批量保存作答（答题过程只改内存，**离开页面 / 提交前**一次性落库）。
 *
 * 刻意用 `refetchType: 'none'`：只把 practice 域的缓存标记为过期，**不立刻重取**。
 * 调用点要么正要离开页面、要么只是标签页被隐藏的兜底保存 ——
 * 在这里触发重取就会立刻退化成「点一下发好几个请求」，正是本次要消灭的行为。
 * 下次挂载时缓存已过期，自然会取到最新数据。
 */
export function useSavePracticeAnswerDrafts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: SavePracticeAnswerDraftsInput) =>
      savePracticeAnswerDrafts(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: practiceKeys.all,
        refetchType: 'none',
      })
    },
  })
}
