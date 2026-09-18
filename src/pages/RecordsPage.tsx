import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BROWSE_CONTAINER } from '@/components/layout/app-shell'
import { formatDuration } from '@/hooks/use-practice-clock'
import {
  usePracticeSessionStats,
  usePracticeTypeAccuracy,
} from '@/hooks/use-practice-session'
import {
  accuracyPercent,
  byRecentUpdate,
  formatShortDate,
  recordTimestamp,
  recordTitle,
  resumeTarget,
  statusLabel,
} from '@/lib/practice-record'
import { toPracticeErrorMessage, type PracticeSessionStat } from '@/services/practice'
import { sumBy } from '@/lib/number'
import { cn } from '@/lib/utils'

/**
 * 练习记录页。
 *
 * 三块内容，对应三类问题：
 * 1. **未完成的练习** —— 我还有什么没做完？（可一键继续）
 * 2. **统计图表** —— 我整体掌握得怎么样？（题型正确率 + 最近趋势）
 * 3. **记录列表** —— 我具体做过什么？（整卷记录 / 题型记录 两个分栏）
 *
 * ⚠️ 分数与正确率**不是前端算的**：`practice_answers.is_correct` 已被列级 REVOKE，
 * 浏览器读不到。数据来自两个 SECURITY DEFINER 聚合函数（`practice_session_stats` /
 * `practice_type_accuracy`），它们只回**计数**，不回题目级答案，
 * 因此这里能看到「对了几题」，但看不到「哪几题、正确答案是什么」——
 * 那属于 PRD 里刻意保留的受控出口（提交判分 / 重做），不是本页的遗漏。
 */

const TABS = [
  { value: 'paper', label: '整卷记录' },
  { value: 'drill', label: '题型记录' },
] as const

type TabValue = (typeof TABS)[number]['value']

export default function RecordsPage() {
  const navigate = useNavigate()
  const stats = usePracticeSessionStats()
  const typeAccuracy = usePracticeTypeAccuracy()
  const [tab, setTab] = useState<TabValue>('paper')

  // ⚠️ 排序必须在这里做：`practice_session_stats` 内部是 `started_at desc`，
  // 而「最近」的定义是 `updated_at desc`（见 lib/practice-record.ts 的 byRecentUpdate）。
  // 一处排好，下面「未完成 / 两个历史分栏 / 趋势取材」全部继承同一个顺序，
  // 不会再出现「首页说的最近」和「记录页说的最近」不一致。
  const all = useMemo(() => [...(stats.data ?? [])].sort(byRecentUpdate), [stats.data])

  /** 未完成：active / paused（顺序继承上面的「最近更新」）。 */
  const incomplete = useMemo(
    () => all.filter((row) => row.status === 'active' || row.status === 'paused'),
    [all],
  )

  /** 整卷记录 = session_type 'exam'；题型记录 = 'drill'（含历史形态 'practice'）。 */
  const paperRecords = useMemo(
    () => all.filter((row) => row.sessionType === 'exam'),
    [all],
  )
  const drillRecords = useMemo(
    () =>
      all.filter(
        (row) => row.sessionType === 'drill' || row.sessionType === 'practice',
      ),
    [all],
  )

  const overview = useMemo(() => {
    const completed = all.filter((row) => row.status === 'completed').length
    // 三者都是整数（秒 / 题数），用 sumBy 即可 —— 整数求和无浮点精度问题。
    const elapsed = sumBy(all, (row) => row.elapsedSeconds)
    const graded = sumBy(all, (row) => row.gradedCount)
    const correct = sumBy(all, (row) => row.correctCount)
    return {
      sessions: all.length,
      completed,
      elapsed,
      accuracy: accuracyPercent(correct, graded),
      graded,
    }
  }, [all])

  const accuracyRows = useMemo(() => {
    return (typeAccuracy.data ?? [])
      .filter((row) => row.gradedCount > 0)
      .map((row) => ({
        type: row.sectionType,
        graded: row.gradedCount,
        correct: row.correctCount,
        percent: accuracyPercent(row.correctCount, row.gradedCount) ?? 0,
      }))
      .sort((a, b) => b.graded - a.graded)
  }, [typeAccuracy.data])

  /**
   * 趋势取最近 12 次「有客观题可判分」的练习，按时间正序画。
   * 「最近」同样是 updated_at 口径（继承 `all`），横轴用完成/更新时间，
   * 与排序字段一致，不会出现柱子在右、日期在左的错位。
   */
  const trend = useMemo(() => {
    return all
      .filter((row) => row.gradedCount > 0)
      .slice(0, 12)
      .reverse()
      .map((row) => ({
        key: row.sessionId,
        label: formatShortDate(row.completedAt ?? row.updatedAt),
        title: recordTitle(row),
        percent: accuracyPercent(row.correctCount, row.gradedCount) ?? 0,
        correct: row.correctCount,
        graded: row.gradedCount,
      }))
  }, [all])

  const rows = tab === 'paper' ? paperRecords : drillRecords

  return (
    <main className={`${BROWSE_CONTAINER} py-12 md:py-16`}>
      <p className="text-[10px] font-bold tracking-[1.2px] text-subtle-foreground uppercase">
        Practice Records
      </p>
      <h1 className="mt-3 font-heading text-2xl leading-tight font-semibold md:text-[2.5rem]">
        练习记录
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        未完成的练习、正确率统计与历史记录都在这里。
      </p>

      {stats.isPending ? (
        <p className="mt-10 text-sm text-muted-foreground">正在加载练习记录…</p>
      ) : null}

      {stats.isError ? (
        <Card className="mt-10">
          <CardContent className="flex flex-col items-start gap-3">
            <p className="text-sm font-medium text-foreground">练习记录加载失败</p>
            <p className="text-sm text-muted-foreground">
              {toPracticeErrorMessage(stats.error)}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void stats.refetch()}
            >
              重新加载
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {!stats.isPending && !stats.isError ? (
        <>
          {/* ① 未完成的练习：有才显示，空着不占版面 */}
          {incomplete.length > 0 ? (
            <section className="mt-10">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-heading text-lg font-semibold">
                  未完成的练习
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {incomplete.length} 项
                  </span>
                </h2>
              </div>
              <ul className="mt-4 flex list-none flex-col gap-3">
                {incomplete.map((row) => {
                  const target = resumeTarget({
                    id: row.sessionId,
                    sessionType: row.sessionType,
                    paperId: row.paperId,
                    sectionId: null,
                  })
                  return (
                    <li key={row.sessionId}>
                      <Card className="border-primary-soft-border bg-primary-selected">
                        <CardContent className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {recordTitle(row)}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {statusLabel(row.status)} · 已答 {row.answeredCount} 题 ·
                              用时 {formatDuration(row.elapsedSeconds)}
                              {row.timeLimitSeconds === null
                                ? ''
                                : ` / ${formatDuration(row.timeLimitSeconds)}`}
                              {' · '}
                              {recordTimestamp(row)}
                            </p>
                          </div>
                          {target ? (
                            <Button
                              type="button"
                              size="md"
                              className="h-11 w-full md:h-9 md:w-auto"
                              onClick={() => void navigate(target)}
                            >
                              继续练习
                              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.5} />
                            </Button>
                          ) : null}
                        </CardContent>
                      </Card>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : (
            <p className="mt-10 text-sm text-muted-foreground">
              当前没有未完成的练习。
            </p>
          )}

          {/* ② 概览 */}
          <section className="mt-10">
            <h2 className="font-heading text-lg font-semibold">概览</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <OverviewTile label="练习次数" value={String(overview.sessions)} />
              <OverviewTile label="已完成" value={String(overview.completed)} />
              <OverviewTile label="累计用时" value={formatDuration(overview.elapsed)} />
              <OverviewTile
                label="总正确率"
                value={overview.accuracy === null ? '—' : `${overview.accuracy}%`}
                hint={
                  overview.graded > 0 ? `基于 ${overview.graded} 道客观题` : '暂无判分数据'
                }
              />
            </div>
          </section>

          {/* ③ 图表 */}
          <section className="mt-10 grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="flex flex-col gap-4">
                <div>
                  <p className="text-[10px] font-bold tracking-[1.2px] text-subtle-foreground uppercase">
                    Accuracy by Type
                  </p>
                  <h2 className="mt-1 font-heading text-lg font-semibold">各题型正确率</h2>
                </div>

                {typeAccuracy.isPending ? (
                  <p className="text-sm text-muted-foreground">正在统计…</p>
                ) : typeAccuracy.isError ? (
                  <p className="text-sm text-muted-foreground">
                    {toPracticeErrorMessage(typeAccuracy.error)}
                  </p>
                ) : accuracyRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    还没有可判分的作答。做完一次选择题练习就会有数据。
                  </p>
                ) : (
                  <ul className="flex list-none flex-col gap-4">
                    {accuracyRows.map((row) => (
                      <li key={row.type}>
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="text-sm font-medium text-foreground">
                            {row.type}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {row.correct}/{row.graded} · {row.percent}%
                          </span>
                        </div>
                        <div
                          className="mt-2 h-2.5 w-full overflow-hidden rounded-full"
                          style={{ backgroundColor: 'var(--track)' }}
                          role="img"
                          aria-label={`${row.type} 正确率 ${row.percent}%，${row.graded} 道客观题中答对 ${row.correct} 道`}
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${row.percent}%`,
                              backgroundColor: accuracyColor(row.percent),
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col gap-4">
                <div>
                  <p className="text-[10px] font-bold tracking-[1.2px] text-subtle-foreground uppercase">
                    Recent Trend
                  </p>
                  <h2 className="mt-1 font-heading text-lg font-semibold">最近正确率</h2>
                </div>

                {trend.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    还没有可判分的练习记录。
                  </p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <TrendChart points={trend} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      横轴为练习日期，纵轴为正确率（只统计已判分的客观题）。
                      柱高与颜色都表示数值：≥85% 为绿色，60–84% 为主色，&lt;60% 为红色。
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </section>

          {/* ④ 记录列表：整卷 / 题型两个分栏 */}
          <section className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="font-heading text-lg font-semibold">历史记录</h2>
              <div
                role="tablist"
                aria-label="记录分类"
                className="inline-flex rounded-lg border border-border bg-card p-1"
              >
                {TABS.map((item) => {
                  const active = item.value === tab
                  const count =
                    item.value === 'paper' ? paperRecords.length : drillRecords.length
                  return (
                    <button
                      key={item.value}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTab(item.value)}
                      className={cn(
                        'h-10 rounded-md px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:h-9',
                        active
                          ? 'bg-primary-soft text-primary'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {item.label}
                      <span className="ml-2 text-xs tabular-nums opacity-70">
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {rows.length === 0 ? (
              <Card className="mt-4">
                <CardContent className="flex flex-col items-start gap-3">
                  <p className="text-sm text-muted-foreground">
                    {tab === 'paper'
                      ? '还没有整卷练习记录。'
                      : '还没有题型练习记录。'}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void navigate(tab === 'paper' ? '/exams' : '/exams?tab=drill')
                    }
                  >
                    {tab === 'paper' ? '去整卷练习' : '去题型练习'}
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <ul className="mt-4 flex list-none flex-col gap-3">
                {rows.map((row) => (
                  <RecordRow key={row.sessionId} row={row} />
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </main>
  )
}

/* ── 页面内局部展示组件（不导出，避免 mixed-export）─────────────── */

/** 正确率 → 颜色。语义与结果页的「答对 / 答错」一致（success / destructive）。 */
function accuracyColor(percent: number): string {
  if (percent >= 85) return 'var(--success)'
  if (percent >= 60) return 'var(--primary)'
  return 'var(--destructive)'
}

function OverviewTile({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-4">
      <p className="text-[10px] font-bold tracking-[0.6px] text-subtle-foreground uppercase">
        {label}
      </p>
      <p className="mt-1.5 font-heading text-2xl leading-none font-semibold tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  )
}

/** 一次练习的历史行。 */
function RecordRow({ row }: { row: PracticeSessionStat }) {
  const navigate = useNavigate()
  const percent = accuracyPercent(row.correctCount, row.gradedCount)
  const target = resumeTarget({
    id: row.sessionId,
    sessionType: row.sessionType,
    paperId: row.paperId,
    sectionId: null,
  })
  const isOpen = row.status === 'active' || row.status === 'paused'

  return (
    <li className="rounded-lg border border-border bg-card px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-foreground">
          {recordTitle(row)}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {recordTimestamp(row)}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <Badge
          variant={
            row.status === 'completed'
              ? 'success'
              : isOpen
                ? 'neutral'
                : 'danger'
          }
        >
          {statusLabel(row.status)}
        </Badge>
        <span>
          用时 {formatDuration(row.elapsedSeconds)}
          {row.timeLimitSeconds === null
            ? ''
            : ` / ${formatDuration(row.timeLimitSeconds)}`}
        </span>
        <span>已答 {row.answeredCount} 题</span>
        {percent === null ? (
          <span>无客观题</span>
        ) : (
          <span>
            正确率 <span className="font-semibold text-foreground tabular-nums">{percent}%</span>
            （{row.correctCount}/{row.gradedCount}）
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        {target ? (
          <Button
            type="button"
            variant={isOpen ? 'default' : 'outline'}
            size="sm"
            className="h-10 px-4"
            // 未完成 → 回到原来的会话接着做；已完成 → 同一地址会另起一条新会话
            // （整卷页找不到 active/paused 会话就会新建；题型页则给「重新开始」入口）。
            onClick={() => void navigate(target)}
          >
            {isOpen ? '继续练习' : '再做一次'}
          </Button>
        ) : null}
        {row.sessionType === 'drill' ? (
          <Link
            to="/mistakes"
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            去错题本
          </Link>
        ) : null}
      </div>
    </li>
  )
}

/**
 * 最近正确率趋势（手写 SVG，不引入图表库）。
 *
 * 用 CSS 变量取色而不是写死色值：`--primary` / `--success` / `--destructive`
 * 都定义在 `:root`，跟随设计 token 变化，不会在换肤后失配。
 */
function TrendChart({
  points,
}: {
  points: { key: string; label: string; title: string; percent: number; correct: number; graded: number }[]
}) {
  const WIDTH = 640
  const HEIGHT = 210
  const PAD_LEFT = 34
  const PAD_RIGHT = 12
  const PAD_TOP = 18
  const PAD_BOTTOM = 34
  const innerW = WIDTH - PAD_LEFT - PAD_RIGHT
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM
  const slot = innerW / points.length
  const barWidth = Math.min(30, slot * 0.5)
  const gridValues = [0, 25, 50, 75, 100]

  const yOf = (percent: number) => PAD_TOP + innerH * (1 - percent / 100)

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="h-[210px] w-full min-w-[520px]"
      role="img"
      aria-label={`最近 ${points.length} 次练习的正确率：${points
        .map((point) => `${point.label} ${point.percent}%`)
        .join('，')}`}
    >
      {/* 网格 + 纵轴刻度 */}
      {gridValues.map((value) => (
        <g key={value}>
          <line
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={yOf(value)}
            y2={yOf(value)}
            stroke="var(--border)"
            strokeWidth={1}
          />
          <text
            x={PAD_LEFT - 6}
            y={yOf(value)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={9}
            fill="var(--subtle-foreground)"
          >
            {value}
          </text>
        </g>
      ))}

      {points.map((point, index) => {
        const x = PAD_LEFT + slot * index + (slot - barWidth) / 2
        const y = yOf(point.percent)
        const barHeight = Math.max(2, PAD_TOP + innerH - y)
        return (
          <g key={point.key}>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={3}
              fill={accuracyColor(point.percent)}
            >
              <title>{`${point.title}：${point.correct}/${point.graded}，正确率 ${point.percent}%`}</title>
            </rect>
            <text
              x={x + barWidth / 2}
              y={y - 5}
              textAnchor="middle"
              fontSize={9}
              fill="var(--muted-foreground)"
            >
              {point.percent}
            </text>
            <text
              x={x + barWidth / 2}
              y={HEIGHT - PAD_BOTTOM + 16}
              textAnchor="middle"
              fontSize={9}
              fill="var(--subtle-foreground)"
            >
              {point.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
