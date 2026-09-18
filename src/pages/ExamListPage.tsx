import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { BROWSE_CONTAINER } from '@/components/layout/app-shell'
import { DrillLauncher } from '@/components/practice/DrillLauncher'
import { useExamPapers } from '@/hooks/use-exam-papers'
import { toExamErrorMessage } from '@/services/exams'
import { cn } from '@/lib/utils'

/**
 * 题库页。两种练习模式在这里分流（用户要求：题库要区分整卷练习与题型练习）：
 *
 * - **整卷练习**：把一套真题从头到尾做一遍（`/exams/:paperId/practice`）；
 * - **题型练习**：选题型 + 选年份，把同类题目整合成一次练习（`/drill/:sessionId`）。
 *
 * 模式用 URL 的 `?tab=drill` 表达，而不是纯组件内部 state ——
 * 练习页退出时要能跳回「题型练习」模式，刷新后也停在原来那一栏。
 *
 * ⚠️ 数据链路不变：Page → hooks → services → Supabase，本页不碰 Supabase。
 */

const TABS = [
  { value: 'paper', label: '整卷练习' },
  { value: 'drill', label: '题型练习' },
] as const

type TabValue = (typeof TABS)[number]['value']

/** 列表加载骨架：静态占位，不做闪烁（design-direction「安静」原则）。 */
function ListSkeleton() {
  return (
    <div className="mt-8 flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="h-[84px] rounded-lg border border-border bg-card" />
      ))}
    </div>
  )
}

/** 错误 / 空态卡片（沿用既有 StateCard 设计）。 */
function StateCard({
  title,
  description,
  onRetry,
}: {
  title: string
  description: string
  onRetry?: () => void
}) {
  return (
    <Card className="mt-8">
      <CardContent className="flex flex-col items-start gap-3">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            重新加载
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}

/**
 * 移动卡片行：年份为主 + 正式名称为辅 + 两个明确动作。
 *
 * ⚠️ 刻意**不把整张卡包成一个 `<Link>`** —— 里面还要放「整卷练习」链接，
 * 链接套链接是无效 HTML，读屏与点击行为都会错乱。
 */
function PaperCard({ paper }: { paper: { id: string; year: number; title: string } }) {
  const name = `英语（二）${paper.year} 年真题`
  return (
    <li>
      <Card>
        <CardContent className="flex flex-col gap-3">
          <span className="flex min-w-0 flex-col">
            <span className="font-heading text-3xl leading-none font-semibold tabular-nums text-primary">
              {paper.year}
            </span>
            <span className="mt-1.5 truncate text-sm text-muted-foreground">{name}</span>
          </span>
          <span className="flex items-center gap-3">
            <Link
              to={`/exams/${paper.id}/practice`}
              aria-label={`${name}，开始整卷练习`}
              className={cn(buttonVariants({ variant: 'soft' }), 'h-11 flex-1 px-4')}
            >
              整卷练习
            </Link>
            <Link
              to={`/exams/${paper.id}`}
              className="flex h-11 shrink-0 items-center px-2 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              查看详情
            </Link>
          </span>
        </CardContent>
      </Card>
    </li>
  )
}

export default function ExamListPage() {
  const { data, isPending, isError, error, refetch } = useExamPapers()
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')
  const [yearFilter, setYearFilter] = useState('all')

  const tab: TabValue = searchParams.get('tab') === 'drill' ? 'drill' : 'paper'
  const setTab = (next: TabValue) => {
    const params = new URLSearchParams(searchParams)
    if (next === 'paper') params.delete('tab')
    else params.set('tab', next)
    setSearchParams(params, { replace: true })
  }

  const papers = useMemo(() => data ?? [], [data])

  const years = useMemo(
    () => [...new Set(papers.map((paper) => paper.year))].sort((a, b) => b - a),
    [papers],
  )

  const rows = useMemo(() => {
    const keyword = query.trim()
    return papers
      .filter((paper) =>
        yearFilter === 'all' ? true : String(paper.year) === yearFilter,
      )
      .filter((paper) => {
        if (keyword === '') return true
        return (
          String(paper.year).includes(keyword) ||
          `英语（二）${paper.year} 年真题`.includes(keyword)
        )
      })
  }, [papers, query, yearFilter])

  return (
    <main className={`${BROWSE_CONTAINER} py-12 md:py-16`}>
      <p className="text-[10px] font-bold tracking-[1.2px] text-subtle-foreground uppercase">
        Examination Archive
      </p>
      <h1 className="mt-3 font-heading text-2xl leading-tight font-semibold md:text-[2.5rem]">
        题库
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        {tab === 'paper'
          ? papers.length > 0
            ? `整卷练习：把一套真题从头到尾做一遍。共 ${papers.length} 套，按年份从新到旧排列。`
            : '整卷练习：把一套真题从头到尾做一遍。'
          : '题型练习：选定题型与年份，把同类题目整合成一次练习，按年份顺序连着做。'}
      </p>

      {/* 模式切换（role=tablist）：切换只改 URL 查询参数，不重新拉数据 */}
      <div
        role="tablist"
        aria-label="练习模式"
        className="mt-8 inline-flex rounded-lg border border-border bg-card p-1"
      >
        {TABS.map((item) => {
          const active = item.value === tab
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
            </button>
          )
        })}
      </div>

      {tab === 'drill' ? <DrillLauncher /> : null}

      {tab === 'paper' ? (
        <>
          {/* S8：搜索 + 年份筛选（桌面并排，移动整宽纵排） */}
          {papers.length > 0 ? (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground"
                  strokeWidth={1.5}
                />
                <Input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索年份或试卷名称"
                  aria-label="搜索试卷"
                  className="pl-9"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="sr-only sm:not-sr-only">年份</span>
                <select
                  value={yearFilter}
                  onChange={(event) => setYearFilter(event.target.value)}
                  className="h-10 rounded-md border border-border-strong bg-card px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-32"
                >
                  <option value="all">全部年份</option>
                  {years.map((year) => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}

          {isPending ? <ListSkeleton /> : null}

          {isError ? (
            <StateCard
              title="试卷列表加载失败"
              // 底层错误结构只在 service 层解读，页面只负责展示这句话。
              description={toExamErrorMessage(error)}
              onRetry={() => {
                void refetch()
              }}
            />
          ) : null}

          {!isPending && !isError && papers.length === 0 ? (
            <StateCard
              title="暂无试卷"
              description="题库还没有可用的试卷数据，稍后再来看看。"
            />
          ) : null}

          {!isPending && !isError && papers.length > 0 && rows.length === 0 ? (
            <StateCard
              title="没有匹配的试卷"
              description="换个年份或关键词试试。"
              onRetry={() => {
                setQuery('')
                setYearFilter('all')
              }}
            />
          ) : null}

          {/* 桌面：表格 */}
          {rows.length > 0 ? (
            <table className="mt-8 hidden w-full border-collapse md:table">
              <caption className="sr-only">历年真题列表</caption>
              <thead>
                <tr className="border-b border-border">
                  <th
                    scope="col"
                    className="w-32 py-3 pr-4 text-left text-[10px] font-bold tracking-[1px] text-subtle-foreground uppercase"
                  >
                    Year
                  </th>
                  <th
                    scope="col"
                    className="py-3 pr-4 text-left text-[10px] font-bold tracking-[1px] text-subtle-foreground uppercase"
                  >
                    Paper
                  </th>
                  <th
                    scope="col"
                    className="w-56 py-3 text-right text-[10px] font-bold tracking-[1px] text-subtle-foreground uppercase"
                  >
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((paper) => (
                  <tr
                    key={paper.id}
                    className="border-b border-border transition-colors last:border-0 hover:bg-muted/60"
                  >
                    <td className="py-5 pr-4 align-middle">
                      <span className="font-heading text-sm font-bold text-primary tabular-nums">
                        {paper.year}
                      </span>
                    </td>
                    <td className="py-5 pr-4 align-middle text-[13px] font-semibold text-foreground">
                      {`英语（二）${paper.year} 年真题`}
                    </td>
                    <td className="py-5 text-right align-middle">
                      <span className="inline-flex items-center gap-4">
                        <Link
                          to={`/exams/${paper.id}/practice`}
                          aria-label={`${paper.year} 年真题，开始整卷练习`}
                          className={cn(buttonVariants({ variant: 'soft', size: 'sm' }))}
                        >
                          整卷练习
                        </Link>
                        <Link
                          to={`/exams/${paper.id}`}
                          className="text-[13px] font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        >
                          详情
                        </Link>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {/* 移动：卡片列表 */}
          {rows.length > 0 ? (
            <ul className="mt-6 flex list-none flex-col gap-3 md:hidden">
              {rows.map((paper) => (
                <PaperCard key={paper.id} paper={paper} />
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </main>
  )
}
