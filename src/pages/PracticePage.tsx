import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  PracticeRunner,
  type RunnerQuestion,
} from '@/components/practice/PracticeRunner'
import type { NavigatorGroup } from '@/components/practice/QuestionNavigator'
import { useExamPaper } from '@/hooks/use-exam-paper'
import { useResumablePracticeSession } from '@/hooks/use-practice-session'
import { useCreatePracticeSession } from '@/hooks/use-practice-mutations'
import { deriveTimeLimitSeconds } from '@/lib/constants'
import { toExamErrorMessage, type ExamSectionWithItems } from '@/services/exams'
import {
  PracticeError,
  toPracticeErrorMessage,
  type PracticeGradeResult,
} from '@/services/practice'

/**
 * 单个大题练习（session_type = 'practice'，绑 section_id）。
 *
 * 定位：整卷练习（`/exams/:paperId/practice`）与题型练习（`/drill/:sessionId`）
 * 之外的**定向练习**入口 —— 只想重做某一篇阅读时用它。
 *
 * 本轮起复用共享答题器 `PracticeRunner`：倒计时、选中后才显示答案、
 * 翻译题标记后看参考译文，三处行为与整卷 / 题型练习完全一致，
 * 不再各写一套（旧实现是本页单独维护的 200 行答题逻辑）。
 *
 * ⚠️ 答案边界不变：题目只取公开字段；答案只经单题 RPC 与提交判分下发。
 */

/** 单大题展开成序列：本题只有一组，题号就是大题内序号。 */
function buildSectionPractice(section: ExamSectionWithItems | null): {
  questions: RunnerQuestion[]
  groups: NavigatorGroup[]
} {
  if (!section || section.items.length === 0) return { questions: [], groups: [] }

  const groupTitle = section.type
  const questions: RunnerQuestion[] = section.items.map((item, offset) => ({
    key: item.id,
    globalNo: offset + 1,
    groupIndex: 0,
    groupTitle,
    isTranslation: section.source_id.endsWith('-trans'),
    item,
  }))

  return {
    questions,
    groups: [
      {
        key: section.id,
        label: groupTitle,
        questions: section.items.map((item, offset) => ({
          globalNo: offset + 1,
          index: offset,
          itemNo: item.item_no,
        })),
      },
    ],
  }
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

  const resumable = useResumablePracticeSession({
    sessionType: 'practice',
    sectionId,
  })
  const createSession = useCreatePracticeSession()
  const [graded, setGraded] = useState<PracticeGradeResult[] | null>(null)

  useEffect(() => {
    if (!sectionId) return
    if (graded) return
    if (resumable.isPending) return
    if (resumable.data) return
    if (createSession.isPending || createSession.isSuccess) return
    createSession.mutate({ sessionType: 'practice', sectionId })
  }, [sectionId, graded, resumable, createSession])

  const { questions, groups } = useMemo(
    () => buildSectionPractice(section),
    [section],
  )

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
    const error = resumable.error ?? createSession.error
    return (
      <ErrorScreen
        message={
          error instanceof PracticeError
            ? error.message
            : toPracticeErrorMessage(error)
        }
        onRetry={() => void resumable.refetch()}
      />
    )
  }

  const session = resumable.data ?? createSession.data ?? null
  if (!session) return <FullScreen text="正在准备练习…" />

  const backToPaper = () => void navigate(`/exams/${paperId}`)

  return (
    <PracticeRunner
      key={session.id}
      session={session}
      eyebrow={`${sectionPosition >= 0 ? `第 ${sectionPosition + 1} 大题 · ` : ''}${section.type}`}
      title={section.title || '本大题'}
      questions={questions}
      groups={groups}
      timeLimitSeconds={deriveTimeLimitSeconds(questions.length)}
      graded={graded}
      onGraded={setGraded}
      resultEyebrow="Section Result"
      resultTitle={`${section.title || '本大题'} · 结果`}
      onExit={backToPaper}
      resultActions={
        <>
          <Button type="button" size="md" className="h-11 md:h-10" onClick={backToPaper}>
            返回试卷详情
          </Button>
          <Button
            type="button"
            variant="outline"
            size="md"
            className="h-11 md:h-10"
            onClick={() => void navigate('/exams')}
          >
            返回历年真题
          </Button>
          {graded?.some((result) => result.isCorrect === false) ? (
            <Button
              type="button"
              variant="outline"
              size="md"
              className="h-11 md:h-10"
              onClick={() => void navigate('/mistakes')}
            >
              查看错题本
            </Button>
          ) : null}
        </>
      }
    />
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
