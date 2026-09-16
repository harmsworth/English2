import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useExamPapers } from '@/hooks/use-exam-papers'
import { toExamErrorMessage } from '@/services/exams'
import { Link } from 'react-router-dom'

/** 列表加载骨架（沿用既有样式）。 */
function ListSkeleton() {
  return (
    <div className="mt-8 flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-[84px] animate-pulse rounded-xl bg-muted"
        />
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

/** 一张 paper-level 试卷卡片（presentational）：年份为主 + 正式名称为辅 + 明确 CTA。 */
function PaperRow({
  paper,
}: {
  paper: { id: string; year: number; title: string }
}) {
  const name = `英语（二）${paper.year} 年真题`
  return (
    <li>
      <Link
        to={`/exams/${paper.id}`}
        aria-label={`${name}，开始练习`}
        className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <Card className="transition-colors group-hover:ring-foreground/25">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex min-w-0 flex-col">
              <span className="font-heading text-3xl font-semibold leading-none tabular-nums">
                {paper.year}
              </span>
              <span className="mt-1.5 truncate text-sm text-muted-foreground">
                {name}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
              开始练习
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                className="size-4 transition-transform group-hover:translate-x-0.5"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </span>
          </CardContent>
        </Card>
      </Link>
    </li>
  )
}

/**
 * 历年真题列表（paper-level）：一套试卷一行，年份为主，点击进入 /exams/:id 详情。
 *
 * 数据链路不变：页面 → useExamPapers → getCurrentExamPapers → exam_papers。
 * 本阶段不做题量统计，只呈现 paper 级列表；section / 题目在详情页承载。
 */
export default function ExamListPage() {
  const { data, isPending, isError, error, refetch } = useExamPapers()

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-12">
      <Link
        to="/"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← 返回首页
      </Link>

      <h1 className="mt-4 font-heading text-3xl font-semibold tracking-tight">
        历年真题
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {data && data.length > 0
          ? `共 ${data.length} 套，按年份从新到旧排列。`
          : '按年份从新到旧排列。'}
      </p>

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

      {!isPending && !isError && data && data.length === 0 ? (
        <StateCard
          title="暂无试卷"
          description="题库还没有可用的试卷数据，稍后再来看看。"
        />
      ) : null}

      {data && data.length > 0 ? (
        <ul className="mt-8 flex list-none flex-col gap-3">
          {data.map((paper) => (
            <PaperRow key={paper.id} paper={paper} />
          ))}
        </ul>
      ) : null}
    </main>
  )
}
