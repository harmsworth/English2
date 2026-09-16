import { useMutation, useQueryClient } from '@tanstack/react-query'
import { practiceKeys } from '@/lib/constants'
import {
  createPracticeSession,
  gradePracticeSection,
  updatePracticeSessionProgress,
  upsertPracticeAnswer,
  type CreatePracticeSessionInput,
  type PracticeProgressPatch,
  type UpsertPracticeAnswerInput,
} from '@/services/practice'

/**
 * Practice 相关写操作（TanStack Query mutation）。
 *
 * 与查询一样，Hook 只负责缓存失效与请求状态，实际写库全在 practice service。
 */

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
    },
  })
}

/**
 * 提交并判分整个大题（Phase 6 Goal 6.1）。
 *
 * 成功后刷新该会话与其作答缓存 —— 会话会变成 `completed`，
 * 而 `practice_answers.is_correct` 由服务端写回（前端不回写）。
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
    },
  })
}

/** 保存 / 更新某道题的答案（upsert，不判分）。成功后刷新所属会话缓存。 */
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
