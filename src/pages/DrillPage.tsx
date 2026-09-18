import { useMemo, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BROWSE_CONTAINER } from '@/components/layout/app-shell'
import {
  PracticeRunner,
  toRunnerStem,
  type RunnerQuestion,
} from '@/components/practice/PracticeRunner'
import type { NavigatorGroup } from '@/components/practice/QuestionNavigator'
import { formatDuration } from '@/hooks/use-practice-clock'
import { usePracticeSession } from '@/hooks/use-practice-session'
import { useSectionsByTypeAndYears } from '@/hooks/use-exam-sections'
import { useCreatePracticeSession } from '@/hooks/use-practice-mutations'
import { deriveTimeLimitSeconds } from '@/lib/constants'
import { toExamErrorMessage, type ExamSectionWithYear } from '@/services/exams'
import {
  toPracticeErrorMessage,
  type PracticeGradeResult,
} from '@/services/practice'

/**
 * 题型练习（session_type = 'drill'）。
 *
 * 「题型练习」= 把**同一题型跨年份**的大题整合成一次练习，例如
 * 「2020–2024 的阅读理解」（5 年 × 4 篇 = 20 题）。它在数据库里既不是
 * section_id 也不是 paper_id，而是 `drill_type + drill_years` 这两个新列。
 *
 * 页面分工：
 * - 本页只负责：按会话里的题型/年份取大题 → 展平成题目序列 → 交给共享答题器；
 * - 「选哪些年份的什么题型」在题库页（`/exams?tab=drill`）完成，它建完会话后跳到本页。
 *
 * 因此 `/drill/:sessionId` 是**可分享、可刷新、可恢复**的：刷新页面拿到的是同一次练习，
 * 计时与作答都从会话里恢复。
 *
 * ⚠️ 答案边界不变：题目只取公开字段；答案仍只经 `peek_item_answer`（单题）
 * 与 `grade_practice_section`（提交后）下发。
 */

/** 把多个年份的同类大题展开成一条练习序列（年份升序 → 大题 sort_order 升序）。 */
function buildDrillPractice(sections: ExamSectionWithYear[]): {
  questions: RunnerQuestion[]
  groups: NavigatorGroup[]
} {
  const perYearTotal = new Map<number, number>()
  for (const section of sections) {
    if (section.items.length === 0) continue
    perYearTotal.set(section.year, (perYearTotal.get(section.year) ?? 0) + 1)
  }

  const questions: RunnerQuestion[] = []
  const groups: NavigatorGroup[] = []
  const seenPerYear = new Map<number, number>()
  let cursor = 0

  for (const section of sections) {
    if (section.items.length === 0) continue

    const nth = (seenPerYear.get(section.year) ?? 0) + 1
    seenPerYear.set(section.year, nth)
    // 同一题型一年可能有多个大题（阅读理解 4 篇）—— 只写年份会得到四组同名。
    const groupTitle =
      (perYearTotal.get(section.year) ?? 1) > 1
        ? `${section.year} 年 ${section.type} · 第 ${nth} 篇`
        : `${section.year} 年 ${section.type}`

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
      label: groupTitle,
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

export default function DrillPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()

  const sessionQuery = usePracticeSession(sessionId)
  const createSession = useCreatePracticeSession()
  const [graded, setGraded] = useState<PracticeGradeResult[] | null>(null)

  const session = sessionQuery.data ?? null
  const isDrill = session?.sessionType === 'drill'
  const drillType = isDrill ? (session?.drillType ?? null) : null
  const drillYears = useMemo(
    () => (isDrill ? (session?.drillYears ?? []) : []),
    [isDrill, session?.drillYears],
  )

  const sections = useSectionsByTypeAndYears(drillType, drillYears)
  const { questions, groups } = useMemo(
    () => buildDrillPractice(sections.data ?? []),
    [sections.data],
  )

  const backToBank = () => void navigate('/exams?tab=drill')

  /** 同一题型 + 同一批年份，换一条新会话重做一遍。 */
  const restart = () => {
    if (!drillType || drillYears.length === 0) return
    createSession.mutate(
      { sessionType: 'drill', drillType, drillYears },
      {
        onSuccess: (next) => {
          setGraded(null)
          void navigate(`/drill/${next.id}`, { replace: true })
        },
      },
    )
  }

  if (sessionQuery.isPending) {
    return <FullScreen text="正在加载练习…" />
  }
  if (sessionQuery.isError) {
    return (
      <ErrorScreen
        message={toPracticeErrorMessage(sessionQuery.error)}
        onRetry={() => void sessionQuery.refetch()}
      />
    )
  }
  if (!session) {
    return (
      <FullScreen text="找不到这次练习，可能已经被删除了。">
        <Link
          to="/exams?tab=drill"
          className="text-sm font-medium text-primary underline underline-offset-4"
        >
          去做题型练习
        </Link>
      </FullScreen>
    )
  }
  if (!isDrill) {
    return (
      <FullScreen text="这条记录不是题型练习。">
        <Link
          to="/records"
          className="text-sm font-medium text-primary underline underline-offset-4"
        >
          返回练习记录
        </Link>
      </FullScreen>
    )
  }

  // 已结束（判分完成 / 时间到且未作答）：不再进入答题态，给一个明确的复盘入口。
  // ⚠️ 必须排除「本页刚判完分」：判分会把会话推到 `completed`，若只看 `status`，
  // 刚渲染出来的结果页会被结束态立刻顶掉。`graded` 非空 ⇒ 本页已判分 ⇒ 继续渲染结果视图。
  if (
    (session.status === 'completed' || session.status === 'abandoned') &&
    graded === null
  ) {
    return (
      <DrillFinished
        title={`${drillYears.join('、')} 年 · ${drillType ?? ''}`}
        status={session.status}
        elapsedSeconds={session.elapsedSeconds}
        timeLimitSeconds={session.timeLimitSeconds}
        isRestarting={createSession.isPending}
        onRestart={restart}
        onExit={backToBank}
      />
    )
  }

  if (sections.isPending) {
    return <FullScreen text="正在加载题目…" />
  }
  if (sections.isError) {
    return (
      <ErrorScreen
        message={toExamErrorMessage(sections.error)}
        onRetry={() => void sections.refetch()}
      />
    )
  }
  if (questions.length === 0) {
    return (
      <FullScreen text="这个组合下没有可作答的题目，换一批年份试试。">
        <Link
          to="/exams?tab=drill"
          className="text-sm font-medium text-primary underline underline-offset-4"
        >
          重新选择
        </Link>
      </FullScreen>
    )
  }

  return (
    <PracticeRunner
      // 会话换了就必须重挂：题号、草稿、计时都是「挂载即起点」的状态。
      key={session.id}
      session={session}
      eyebrow="题型练习"
      title={`${drillYears.join('、')} 年 · ${drillType ?? ''}`}
      questions={questions}
      groups={groups}
      timeLimitSeconds={deriveTimeLimitSeconds(questions.length)}
      graded={graded}
      onGraded={setGraded}
      resultEyebrow="Drill Result"
      resultTitle={`${drillType ?? ''} 题型练习 · 结果`}
      onExit={backToBank}
      resultActions={
        <>
          <Button
            type="button"
            size="md"
            className="h-11 md:h-10"
            onClick={restart}
            disabled={createSession.isPending}
          >
            {createSession.isPending ? '正在准备…' : '再练一次'}
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
          <Button
            type="button"
            variant="outline"
            size="md"
            className="h-11 md:h-10"
            onClick={backToBank}
          >
            返回题库
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

/** 已结束的题型练习：不复用答题器，避免「进去发现已经答完」的空转。 */
function DrillFinished({
  title,
  status,
  elapsedSeconds,
  timeLimitSeconds,
  isRestarting,
  onRestart,
  onExit,
}: {
  title: string
  status: string
  elapsedSeconds: number
  timeLimitSeconds: number | null
  isRestarting: boolean
  onRestart: () => void
  onExit: () => void
}) {
  return (
    <main className={`${BROWSE_CONTAINER} py-12`}>
      <p className="text-[10px] font-bold tracking-[1.2px] text-subtle-foreground uppercase">
        Drill Closed
      </p>
      <h1 className="mt-2 font-heading text-2xl leading-tight font-semibold md:text-[2rem]">
        {title}
      </h1>

      <Card className="mt-6 max-w-xl">
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-foreground">这次练习已经结束了。</p>
          <dl className="flex flex-col gap-1.5 text-sm text-muted-foreground">
            <div className="flex gap-2">
              <dt>用时</dt>
              <dd className="tabular-nums text-foreground">
                {formatDuration(elapsedSeconds)}
                {timeLimitSeconds === null
                  ? ''
                  : ` / ${formatDuration(timeLimitSeconds)}`}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt>结束方式</dt>
              <dd className="text-foreground">
                {status === 'abandoned' ? '时间到，未作答' : '已提交判分'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="md"
          className="h-11 md:h-10"
          onClick={onRestart}
          disabled={isRestarting}
        >
          {isRestarting ? '正在准备…' : '重新开始'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="md"
          className="h-11 md:h-10"
          onClick={onExit}
        >
          返回题库
        </Button>
        <Link
          to="/records"
          className="text-sm font-medium text-primary underline underline-offset-4"
        >
          查看练习记录
        </Link>
      </div>
    </main>
  )
}

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
