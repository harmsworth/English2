import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useExamPapers } from '@/hooks/use-exam-papers'
import { toExamErrorMessage } from '@/services/exams'

function ListSkeleton() {
  return (
    <div className="mt-8 flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-[68px] animate-pulse rounded-xl bg-muted"
        />
      ))}
    </div>
  )
}

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
 * 题库列表：展示全部当前版本试卷，按年份倒序。
 *
 * 数据链路：页面 → useExamPapers → exams service → Supabase。
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
          ? `共 ${data.length} 套试卷，按年份从新到旧排列。`
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
          {data.map((paper) => {
            // 标题形如「2026年真题」，年份已经单独展示时就不再重复一遍
            const subtitle = paper.title.includes(String(paper.year))
              ? null
              : paper.title

            return (
              <li key={paper.id}>
                <Link
                  to={`/exams/${paper.id}`}
                  className="group block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Card className="transition-colors group-hover:ring-foreground/25">
                    <CardContent className="flex items-center justify-between gap-4">
                      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <span className="font-heading text-2xl font-semibold tabular-nums">
                          {paper.year}
                        </span>
                        {subtitle ? (
                          <span className="text-sm text-muted-foreground">
                            {subtitle}
                          </span>
                        ) : null}
                      </span>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            )
          })}
        </ul>
      ) : null}
    </main>
  )
}
