import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PracticeQuestion } from '@/components/practice/PracticeQuestion'
import { PracticeResult } from '@/components/practice/PracticeResult'
import { useExamPaper } from '@/hooks/use-exam-paper'
import {
  usePracticeAnswers,
  useResumablePracticeSession,
} from '@/hooks/use-practice-session'
import {
  useCreatePracticeSession,
  useDeletePracticeAnswer,
  useGradePracticeSection,
  useUpdatePracticeSessionProgress,
  useUpsertPracticeAnswer,
} from '@/hooks/use-practice-mutations'
import { toExamErrorMessage } from '@/services/exams'
import { PracticeError, type PracticeGradeResult } from '@/services/practice'

/**
 * Practice 答题页。Phase 5B 做到「能答题、能保存、能恢复」；Phase 6 起支持提交判分与结果展示，
 * 以及翻译题「标记线下完成 → 提交后看参考译文」（Goal 6.3）。
 */

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}

/** 把 query 抛出的错误转成可展示中文（Practice 域错误已是友好文案，直接展示）。 */
function readableError(error: unknown): string {
  if (error instanceof PracticeError) return error.message
  return toExamErrorMessage(error)
}

/**
 * 底部提交说明。**只在 `canSubmit` 成立时渲染**（写作题没有提交这回事）。
 *
 * 按「有无选择题」分派 —— 主观题没有对错与解析，对翻译题说
 * 「可查看对错、正确答案与解析」就是假话。
 */
function submitHint(hasChoice: boolean, answeredCount: number): string {
  if (answeredCount === 0) {
    return hasChoice
      ? '先选择至少一个答案，才能提交。'
      : '先标记「已完成作答」，再提交查看参考译文。'
  }
  return hasChoice
    ? `已作答 ${answeredCount} 题。提交后可查看对错、正确答案与解析；未作答的题目不参与判分，也不会显示答案。`
    : `已标记 ${answeredCount} 题。提交后可查看参考译文；未标记的题目不出现在结果里。`
}

export default function PracticePage() {
  const { paperId, sectionId } = useParams<{
    paperId: string
    sectionId: string
  }>()
  const navigate = useNavigate()

  const paperQuery = useExamPaper(paperId)
  const section = useMemo(
    () => paperQuery.data?.sections.find((s) => s.id === sectionId) ?? null,
    [paperQuery.data, sectionId],
  )
  const sectionPosition = useMemo(
    () => paperQuery.data?.sections.findIndex((s) => s.id === sectionId) ?? -1,
    [paperQuery.data, sectionId],
  )
  const items = section?.items ?? []

  const resumable = useResumablePracticeSession({
    sessionType: 'practice',
    sectionId,
  })
  const createSession = useCreatePracticeSession()
  const updateProgress = useUpdatePracticeSessionProgress()
  const upsertAnswer = useUpsertPracticeAnswer()
  const deleteAnswer = useDeletePracticeAnswer()
  const gradeMutation = useGradePracticeSection()
  const session = resumable.data ?? createSession.data ?? null
  const sessionId = session?.id

  /**
   * 判分结果（Phase 6 Goal 6.1）。非 null 即本页进入「结果视图」。
   *
   * 结果只活在本次页面会话的内存里：提交后会话变为 `completed`，而 resumable 查询只认
   * `active / paused`（见 `getResumablePracticeSession`），所以离开本页再回来看到的是一条
   * 全新会话，而不是上次的结果。回看历史成绩属于后续 Phase，不在 6.1 范围内。
   */
  const [graded, setGraded] = useState<PracticeGradeResult[] | null>(null)

  // 保证存在会话：无 active/paused → 创建一次（isPending/isSuccess 守卫防重复）。
  // 结果视图下不再创建：否则提交后 resumable 一旦刷新为 null（窗口重新聚焦等），
  // 会凭空多出一条新会话。
  useEffect(() => {
    if (!sectionId) return
    if (graded) return
    if (resumable.isPending) return
    if (resumable.data) return
    if (createSession.isPending || createSession.isSuccess) return
    createSession.mutate({ sessionType: 'practice', sectionId })
  }, [sectionId, graded, resumable.isPending, resumable.data, createSession])

  // 当前题索引（UI 态）；会话就绪后按已存进度恢复一次。
  const [index, setIndex] = useState(0)
  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current || !session || items.length === 0) return
    setIndex(clamp(session.currentItemNo - 1, 0, items.length - 1))
    didInit.current = true
  }, [session, items.length])

  const answers = usePracticeAnswers(sessionId)
  const savedByItem = useMemo(() => {
    const map = new Map<string, number>()
    for (const a of answers.data ?? []) {
      if (a.selectedOption !== null) map.set(a.itemId, a.selectedOption)
    }
    return map
  }, [answers.data])

  /**
   * 主观题「已完成作答」的题干 id 集合。
   *
   * 判定依据是 `selected_option === null` —— `upsertPracticeAnswer` 给主观题只写
   * `text_answer`（内容留空：真正写译文是在线下做的），所以这类行必然没有选项下标。
   */
  const textAnsweredIds = useMemo(() => {
    const set = new Set<string>()
    for (const a of answers.data ?? []) {
      if (a.selectedOption === null) set.add(a.itemId)
    }
    return set
  }, [answers.data])

  const [pendingSelection, setPendingSelection] = useState<
    Record<string, number>
  >({})
  const selectedFor = (itemId: string): number | null =>
    pendingSelection[itemId] ?? savedByItem.get(itemId) ?? null

  const [pendingTextMarks, setPendingTextMarks] = useState<
    Record<string, boolean>
  >({})
  const textAnsweredFor = (itemId: string): boolean =>
    pendingTextMarks[itemId] ?? textAnsweredIds.has(itemId)

  const choose = (itemId: string, optionIndex: number) => {
    if (!sessionId) return
    setPendingSelection((prev) => ({ ...prev, [itemId]: optionIndex }))
    upsertAnswer.mutate({ sessionId, itemId, selectedOption: optionIndex })
  }

  /**
   * 标记 / 撤销主观题的「已完成作答」（Phase 6 Goal 6.3）。
   *
   * 标记：写一条空文本作答行 —— 这是**拿到参考译文的唯一通路**
   * （`section_items.extra_data` 已被 REVOKE，只有判分 RPC 会下发，
   * 而 RPC 只返回本次会话实际作答过的题）。
   *
   * 撤销：真删这一行。只改本地 state 是不够的 —— 行还在，撤销后提交依然会看到参考译文。
   */
  const toggleTextAnswer = (itemId: string) => {
    if (!sessionId) return
    const next = !textAnsweredFor(itemId)
    setPendingTextMarks((prev) => ({ ...prev, [itemId]: next }))
    if (next) {
      upsertAnswer.mutate({ sessionId, itemId, textAnswer: '' })
    } else {
      deleteAnswer.mutate({ sessionId, itemId })
    }
  }

  const goTo = (next: number) => {
    if (items.length === 0) return
    const target = clamp(next, 0, items.length - 1)
    setIndex(target)
    const item = items[target]
    if (session && item) {
      updateProgress.mutate({
        id: session.id,
        patch: { currentItemNo: item.item_no },
      })
    }
  }

  const pauseAndExit = () => {
    if (!session) return
    updateProgress.mutate(
      {
        id: session.id,
        patch: { status: 'paused', pausedAt: new Date().toISOString() },
      },
      { onSuccess: () => navigate(`/exams/${paperId}`) },
    )
  }

  // ── 提交判分（Phase 6 Goal 6.1）────────────────────────────────
  const gradeMutate = gradeMutation.mutate

  /**
   * 提交：交给服务端 `grade_practice_section` 判分，结果放进本页状态直接渲染。
   * RPC 幂等（同一次作答重复提交得到同一结果），因此不需要额外的「已提交」防重。
   */
  const submit = () => {
    if (!session) return
    gradeMutate(session.id, { onSuccess: (rows) => setGraded(rows) })
  }

  /**
   * 已作答数 = 选过选项的题 + 标记过「已完成作答」的主观题。
   *
   * ⚠️ 不能只用 `savedByItem.size`：主观题写的是 `text_answer`、`selected_option` 恒为 null，
   * 那样翻译大题（只有 1 小题）的计数永远是 0，提交按钮永远点不动。
   * 这里逐题判定并读 `pendingTextMarks`，让点击立刻反映到计数上。
   */
  const answeredCount = items.reduce((n, item) => {
    const markedText = pendingTextMarks[item.id] ?? textAnsweredIds.has(item.id)
    return savedByItem.has(item.id) || markedText ? n + 1 : n
  }, 0)
  const isSubmitting = gradeMutation.isPending

  /**
   * 是否提供「标记完成 → 提交后看参考译文」。
   *
   * 只有翻译题走这条：17/17 都有 `section_items.extra_data.reference_translation`。
   * 写作题不走 —— 范文 `sample` 只在 2024/2025 的 4 个大题里，且存在**公开可读**的
   * `exam_sections.extra_data`，详情页已经用「参考范文」折叠渲染过了；
   * 练习页再挂一个按钮只会得到一个空结果页。
   *
   * 前端只能按 `source_id` 判定：答案列已 REVOKE，前端看不到"这一题有没有参考内容"。
   */
  const canRevealReference = section?.source_id.endsWith('-trans') ?? false
  const hasChoiceItems = items.some((item) => item.item_type === 'choice')

  /**
   * 本大题有没有「应用内提交」这回事。
   *
   * 选择题可以判分；翻译题可以标记后看参考译文；**写作题两样都没有** ——
   * 范文在详情页，练习页也收不到在线作答。写作题因此不渲染提交按钮，
   * 否则会留下一个永远禁用、且旁边写着「提交查看参考译文」的假入口。
   */
  const canSubmit = hasChoiceItems || canRevealReference

  // ── 状态：加载 / 错误 / 空 ─────────────────────────────────────
  if (paperQuery.isPending) return <FullScreen text="正在加载题目…" />
  if (paperQuery.isError) {
    return (
      <ErrorScreen
        message={toExamErrorMessage(paperQuery.error)}
        onRetry={() => void paperQuery.refetch()}
      />
    )
  }
  if (!section) {
    return (
      <FullScreen text="找不到这个大题，回到试卷详情重新选择吧。">
        <Link
          to={`/exams/${paperId}`}
          className="text-sm font-medium text-primary underline underline-offset-4"
        >
          返回试卷详情
        </Link>
      </FullScreen>
    )
  }

  if (resumable.isError || createSession.isError) {
    return (
      <ErrorScreen
        message={readableError(resumable.error ?? createSession.error)}
        onRetry={() => {
          void resumable.refetch()
        }}
      />
    )
  }
  if (!session) return <FullScreen text="正在准备练习…" />

  // 已判分：本次提交成功后进入结果视图
  if (graded) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 py-10">
        <Link
          to={`/exams/${paperId}`}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← 返回试卷详情
        </Link>

        <header className="mt-4 flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {section.title || '本大题'} · 结果
          </h1>
          <p className="text-sm text-muted-foreground">
            {sectionPosition >= 0 ? `第 ${sectionPosition + 1} 大题 · ` : ''}
            {section.type}
          </p>
        </header>

        <div className="mt-6">
          <PracticeResult
            items={items}
            results={graded}
            totalItemCount={items.length}
          />
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4 border-t pt-6">
          <Button
            type="button"
            onClick={() => {
              void navigate(`/exams/${paperId}`)
            }}
          >
            返回试卷详情
          </Button>
          <Link
            to="/exams"
            className="text-sm font-medium text-primary underline underline-offset-4"
          >
            返回历年真题
          </Link>
          {/* 只有真的有答错才提错题本 —— 全对还给入口是误导（Phase 7） */}
          {graded.some((result) => result.isCorrect === false) ? (
            <Link
              to="/mistakes"
              className="text-sm font-medium text-primary underline underline-offset-4"
            >
              查看错题本
            </Link>
          ) : null}
        </div>
      </main>
    )
  }

  if (isSubmitting) return <FullScreen text="正在判分…" />

  const current = items[index]
  if (!current) {
    return <FullScreen text="本大题暂无可作答的题目。" />
  }

  const isLast = index === items.length - 1
  const isFirst = index === 0
  const saving = upsertAnswer.isPending || updateProgress.isPending

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col px-5 py-10">
      <header className="flex flex-col gap-1">
        <Link
          to={`/exams/${paperId}`}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          ← 返回试卷详情
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-tight">
          Practice · {section.type}
        </h1>
        <p className="text-sm text-muted-foreground">
          {sectionPosition >= 0 ? `第 ${sectionPosition + 1} 大题` : ''}
          {section.title ? ` · ${section.title}` : ''}
        </p>
      </header>

      <div className="mt-6 flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          第 {index + 1} / {items.length} 题
          <span className="ml-2 text-muted-foreground">
            （本大题第 {current.item_no} 小题）
          </span>
        </span>
        <span
          className={saving ? 'text-xs text-muted-foreground' : 'text-xs text-transparent'}
          aria-live="polite"
        >
          保存中…
        </span>
      </div>

      <Card className="mt-3">
        <CardContent>
          <PracticeQuestion
            item={current}
            selectedOption={selectedFor(current.id)}
            onSelect={(optionIndex) => choose(current.id, optionIndex)}
            isTextAnswered={
              canRevealReference ? textAnsweredFor(current.id) : undefined
            }
            onToggleTextAnswer={
              canRevealReference
                ? () => toggleTextAnswer(current.id)
                : undefined
            }
          />
        </CardContent>
      </Card>

      <div className="mt-6 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => goTo(index - 1)}
          disabled={isFirst}
        >
          上一题
        </Button>
        {isLast ? (
          <span className="text-sm text-muted-foreground">本大题已到最后一题</span>
        ) : (
          <Button type="button" onClick={() => goTo(index + 1)}>
            下一题
          </Button>
        )}
      </div>

      <div className="mt-8 border-t pt-6">
        <div className="flex flex-wrap items-center gap-3">
          {canSubmit ? (
            <Button
              type="button"
              onClick={submit}
              disabled={isSubmitting || answeredCount === 0}
            >
              {isSubmitting ? '提交中…' : '提交并查看结果'}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={pauseAndExit}
          >
            暂停并退出
          </Button>
        </div>

        {gradeMutation.isError ? (
          <p className="mt-3 text-sm text-destructive">
            {readableError(gradeMutation.error)}
          </p>
        ) : null}

        {canSubmit ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {submitHint(hasChoiceItems, answeredCount)}
          </p>
        ) : null}
      </div>
    </main>
  )
}

/* ── 页面内局部展示组件（不导出，避免 mixed-export）─────────────── */

function FullScreen({
  text,
  children,
}: {
  text: string
  children?: ReactNode
}) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col items-center justify-center gap-4 px-5 py-16 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      {children}
    </main>
  )
}

function ErrorScreen({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl flex-col items-center justify-center gap-4 px-5 py-16 text-center">
      <p className="text-sm font-medium text-foreground">练习加载失败</p>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        重新加载
      </Button>
    </main>
  )
}
