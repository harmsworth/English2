import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useExamPapers } from '@/hooks/use-exam-papers'
import { useSectionsByTypeAndYears } from '@/hooks/use-exam-sections'
import { useResumablePracticeSession } from '@/hooks/use-practice-session'
import { useCreatePracticeSession } from '@/hooks/use-practice-mutations'
import { SECTION_TYPES, deriveTimeLimitSeconds } from '@/lib/constants'
import { sumBy } from '@/lib/number'
import { toExamErrorMessage } from '@/services/exams'
import { toPracticeErrorMessage } from '@/services/practice'
import { cn } from '@/lib/utils'

/**
 * 题型练习的「选题」面板：挑一个题型 + 一批年份，把同类的题目整合成一次练习。
 *
 * 例如「阅读理解 + 2020~2024」= 5 年 × 4 篇 = 20 个大题，按年份顺序连着做。
 *
 * 两件事值得注意：
 * 1. **题量与限时不是猜的**：面板直接复用题型练习页同一条查询（同一个 query key），
 *    因此这里显示的题数就是等一下真要做的题数，且进入练习页时命中缓存、秒开。
 * 2. **同题型同年份会恢复而不是新建**：如果这个组合已经有 active/paused 会话，
 *    按钮变成「继续未完成的练习」，避免反复建出半途而废的会话。
 *
 * ⚠️ 答案边界不变：这里只统计题量，取的是公开字段（不含任何答案列）。
 */
export function DrillLauncher() {
  const navigate = useNavigate()
  const { data: papers, isPending } = useExamPapers()

  const years = useMemo(
    () => [...new Set((papers ?? []).map((paper) => paper.year))].sort((a, b) => b - a),
    [papers],
  )

  const [type, setType] = useState<string>(SECTION_TYPES[0])
  const [selectedYears, setSelectedYears] = useState<number[]>([])

  // 年份集合一律升序：用户按倒序勾选，但「先做哪年」应当是时间顺序。
  const drillYears = useMemo(
    () => [...selectedYears].sort((a, b) => a - b),
    [selectedYears],
  )

  const preview = useSectionsByTypeAndYears(type, drillYears)
  const sectionCount = preview.data?.length ?? 0
  const itemCount = useMemo(
    () => sumBy(preview.data ?? [], (section) => section.items.length),
    [preview.data],
  )

  const resumable = useResumablePracticeSession(
    { sessionType: 'drill', drillType: type, drillYears },
    drillYears.length > 0,
  )
  const createSession = useCreatePracticeSession()

  const toggleYear = (year: number) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((value) => value !== year) : [...prev, year],
    )
  }

  const start = () => {
    if (drillYears.length === 0 || itemCount === 0) return
    const existing = resumable.data
    if (existing) {
      void navigate(`/drill/${existing.id}`)
      return
    }
    createSession.mutate(
      { sessionType: 'drill', drillType: type, drillYears },
      { onSuccess: (session) => void navigate(`/drill/${session.id}`) },
    )
  }

  const noSelection = drillYears.length === 0
  const emptyCombination = !noSelection && !preview.isPending && itemCount === 0
  const canStart = !noSelection && !emptyCombination && !createSession.isPending

  const limitMinutes = itemCount > 0 ? Math.round(deriveTimeLimitSeconds(itemCount) / 60) : 0

  return (
    <div className="mt-6 flex flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-5">
          <div>
            <p className="text-[10px] font-bold tracking-[1.2px] text-subtle-foreground uppercase">
              Step 1 · Question Type
            </p>
            <h2 className="mt-1.5 font-heading text-lg font-semibold">选一个题型</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {SECTION_TYPES.map((candidate) => {
                const active = candidate === type
                return (
                  <button
                    key={candidate}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setType(candidate)}
                    className={cn(
                      'h-11 rounded-md border px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9',
                      active
                        ? 'border-primary-soft-border bg-primary-soft text-primary'
                        : 'border-border-strong bg-card text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {candidate}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="border-t pt-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold tracking-[1.2px] text-subtle-foreground uppercase">
                  Step 2 · Years
                </p>
                <h2 className="mt-1.5 font-heading text-lg font-semibold">选年份（可多选）</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => setSelectedYears(years.slice(0, 5))}
                  disabled={years.length === 0}
                >
                  最近 5 年
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={() => setSelectedYears(years)}
                  disabled={years.length === 0}
                >
                  全选
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9"
                  onClick={() => setSelectedYears([])}
                  disabled={noSelection}
                >
                  清空
                </Button>
              </div>
            </div>

            {isPending ? (
              <p className="mt-3 text-sm text-muted-foreground">正在加载年份…</p>
            ) : years.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">题库里还没有年份数据。</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {years.map((year) => {
                  const active = selectedYears.includes(year)
                  return (
                    <button
                      key={year}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleYear(year)}
                      className={cn(
                        'h-11 w-16 rounded-md border text-sm font-semibold tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9',
                        active
                          ? 'border-primary-soft-border bg-primary-soft text-primary'
                          : 'border-border-strong bg-card text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {year}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 摘要 + 开始：把「等一下要做什么」讲清楚，再让人点 */}
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
              <Layers aria-hidden="true" className="size-4" strokeWidth={1.5} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">
                {noSelection
                  ? '还没选年份'
                  : `${drillYears.join('、')} 年 · ${type}`}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {noSelection
                  ? '选好年份后，这里会显示题量与限时。'
                  : preview.isPending
                    ? '正在统计题量…'
                    : preview.isError
                      ? toExamErrorMessage(preview.error)
                      : emptyCombination
                        ? '这个题型在这些年份没有题目，换一批年份试试。'
                        : `共 ${sectionCount} 个大题 · ${itemCount} 道题 · 限时 ${limitMinutes} 分钟`}
              </p>
            </div>
          </div>

          {resumable.data ? (
            <p className="text-xs text-muted-foreground">
              这个组合有一次没做完的练习，继续它不会新建记录。
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Button
              type="button"
              size="md"
              className="h-11 w-full md:h-10 md:w-auto"
              onClick={start}
              disabled={!canStart}
            >
              {createSession.isPending
                ? '正在准备…'
                : resumable.data
                  ? '继续未完成的练习'
                  : '开始题型练习'}
              <ChevronRight aria-hidden="true" className="size-4" strokeWidth={1.5} />
            </Button>
            <p className="text-xs text-muted-foreground">
              按年份从早到晚排列；自己控制节奏，时间到会自动交卷。
            </p>
          </div>

          {createSession.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {toPracticeErrorMessage(createSession.error)}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
