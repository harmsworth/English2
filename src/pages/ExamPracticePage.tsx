import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  PracticeRunner,
  toRunnerStem,
  type RunnerQuestion,
} from '@/components/practice/PracticeRunner'
import type { NavigatorGroup } from '@/components/practice/QuestionNavigator'
import { useExamPaper } from '@/hooks/use-exam-paper'
import { useResumablePracticeSession } from '@/hooks/use-practice-session'
import { useCreatePracticeSession } from '@/hooks/use-practice-mutations'
import { deriveTimeLimitSeconds } from '@/lib/constants'
import { toExamErrorMessage, type ExamPaperDetail } from '@/services/exams'
import type { PracticeGradeResult } from '@/services/practice'

/**
 * 整卷练习（session_type = 'exam'，绑 paper_id）：把一套真题从头到尾做一遍。
 *
 * 本页只负责三件事：
 * 1. 把试卷与会话准备好（有 active/paused 会话就恢复，没有就建一条）；
 * 2. 把四层结构展开成「题目序列 + 题号导航分组」；
 * 3. 决定结果显示什么、退出回哪里。
 *
 * 答题 UI / 草稿 / 乐观态 / 倒计时 / 判分全部交给 `PracticeRunner` ——
 * 题型练习（`/drill/:sessionId`）走的是同一个组件，两边行为必须一致。
 *
 * ⚠️ 答案边界不变：常规查询仍拿不到答案列；「答题时显示答案」走单题 RPC。
 */

/** 把试卷的四层结构展开为练习序列（顶层大题顺序 → 小题 item_no 升序）。 */
function buildPaperPractice(paper: ExamPaperDetail | null): {
  questions: RunnerQuestion[]
  groups: NavigatorGroup[]
} {
  if (!paper) return { questions: [], groups: [] }

  const questions: RunnerQuestion[] = []
  const groups: NavigatorGroup[] = []
  let cursor = 0

  for (const [sectionIndex, section] of paper.sections.entries()) {
    if (section.items.length === 0) continue
    const groupTitle = `${section.title || section.type}`
    // 大题带过来的原文 / 要求 / 图表 —— 答题页靠它渲染题干，不能只留小题。
    const stem = toRunnerStem(section)

    for (const item of section.items) {
      questions.push({
        key: item.id,
        globalNo: questions.length + 1,
        groupIndex: groups.length,
        groupTitle,
        isTranslation: section.source_id.endsWith('-trans'),
        stem,
        item,
      })
    }

    groups.push({
      key: section.id,
      label: `${sectionIndex + 1}. ${section.type}`,
      questions: section.items.map((item, offset) => ({
        globalNo: cursor + offset + 1,
        index: cursor + offset,
        itemNo: item.item_no,
      })),
    })
    cursor += section.items.length
  }

  return { questions, groups }
}

export default function ExamPracticePage() {
  const { paperId } = useParams<{ paperId: string }>()
  const navigate = useNavigate()

  const paperQuery = useExamPaper(paperId)

  const resumableSession = useResumablePracticeSession(
    { sessionType: 'exam', paperId },
    Boolean(paperId),
  )
  const createSession = useCreatePracticeSession()

  // 判分结果由本页持有：提交后会话变为 completed，页面必须停在结果视图。
  const [graded, setGraded] = useState<PracticeGradeResult[] | null>(null)

  useEffect(() => {
    if (!paperId) return
    if (graded) return
    if (resumableSession.isPending) return
    if (resumableSession.data) return
    if (createSession.isPending || createSession.isSuccess) return
    createSession.mutate({ sessionType: 'exam', paperId })
  }, [paperId, graded, resumableSession, createSession])

  const paper = paperQuery.data ?? null
  const { questions, groups } = useMemo(() => buildPaperPractice(paper), [paper])

  if (paperQuery.isPending) {
    return <FullScreen text="正在加载整卷…" />
  }
  if (paperQuery.isError) {
    return (
      <ErrorScreen
        message={toExamErrorMessage(paperQuery.error)}
        onRetry={() => void paperQuery.refetch()}
      />
    )
  }
  if (!paper) {
    return <FullScreen text="找不到这套试卷。" />
  }
  if (resumableSession.isError || createSession.isError) {
    return (
      <ErrorScreen
        message="练习会话创建失败，请稍后重试。"
        onRetry={() => void resumableSession.refetch()}
      />
    )
  }

  const session = resumableSession.data ?? createSession.data ?? null
  if (!session) {
    return <FullScreen text="正在准备练习…" />
  }

  const backToPaper = () => void navigate(`/exams/${paper.id}`)

  return (
    <PracticeRunner
      // 会话换了就必须重挂：题号、草稿、计时都是「挂载即起点」的状态。
      key={session.id}
      session={session}
      eyebrow="整卷练习"
      title={paper.title}
      questions={questions}
      groups={groups}
      timeLimitSeconds={deriveTimeLimitSeconds(questions.length)}
      graded={graded}
      onGraded={setGraded}
      resultEyebrow="Full Paper Result"
      resultTitle={`${paper.title} · 结果`}
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
          <Button
            type="button"
            variant="outline"
            size="md"
            className="h-11 md:h-10"
            onClick={() => void navigate('/records')}
          >
            查看练习记录
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

function FullScreen({ text }: { text: string }) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-3xl items-center justify-center px-5 py-16 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
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
