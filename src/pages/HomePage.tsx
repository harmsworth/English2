import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { BROWSE_CONTAINER } from '@/components/layout/app-shell'
import { useExamPapers } from '@/hooks/use-exam-papers'
import { useIncompletePracticeSessions } from '@/hooks/use-practice-session'
import { formatDuration } from '@/hooks/use-practice-clock'
import {
  formatTimestamp,
  recordTitle,
  resumeTarget,
  statusLabel,
} from '@/lib/practice-record'

/** 首页最多提示几条 —— 这是「提醒」，不是记录页，超出部分交给 /records。 */
const INCOMPLETE_PREVIEW_LIMIT = 3

export default function HomePage() {
  const navigate = useNavigate()
  // 只用来定位「最新一套」的整卷入口；列表本身在 /exams。
  // `getCurrentExamPapers` 已按 year DESC 排序，取第 0 条即最新年份。
  const { data: papers } = useExamPapers()
  const latestPaperId = papers?.[0]?.id ?? null

  // 会话表里只有 paper_id，没有试卷标题；用已经加载好的列表把它翻译成「2020 年真题」。
  const paperNameById = useMemo(
    () =>
      new Map(
        (papers ?? []).map((paper) => [
          paper.id,
          `英语（二）${paper.year} 年真题`,
        ]),
      ),
    [papers],
  )

  const incomplete = useIncompletePracticeSessions()
  const pending = useMemo(
    () => (incomplete.data ?? []).slice(0, INCOMPLETE_PREVIEW_LIMIT),
    [incomplete.data],
  )

  return (
    <main className={`${BROWSE_CONTAINER} flex flex-col py-12 md:py-16`}>
      <section className="flex min-h-[55svh] flex-col justify-center">
        <p className="text-[10px] font-bold tracking-[1.2px] text-subtle-foreground uppercase">
          考研英语二 · 真题学习
        </p>

        <h1 className="mt-3 font-heading text-[2.5rem] leading-tight font-semibold md:text-[4rem]">
          英语真题
        </h1>

        <p className="mt-4 max-w-xl text-lg leading-8 text-muted-foreground">
          每天进步一点。
        </p>

        {/* 移动端全宽纵排 44px，桌面并排（§9 规则 #8） */}
        <div className="mt-10 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-3">
          {/*
            「开始学习」= 直接进入整卷练习（最新一套），与「查看历年真题」的列表页区分开。
            整卷页自己负责恢复/新建会话，这里不查 session，避免首页多一次请求。
          */}
          <Button
            type="button"
            size="md"
            className="h-11 w-full md:h-10 md:w-auto"
            disabled={!latestPaperId}
            onClick={() => {
              if (latestPaperId) void navigate(`/exams/${latestPaperId}/practice`)
            }}
          >
            开始学习
          </Button>
          <Button
            type="button"
            variant="outline"
            size="md"
            className="h-11 w-full md:h-10 md:w-auto"
            onClick={() => {
              void navigate('/exams')
            }}
          >
            查看历年真题
          </Button>
          {/* Phase 7：错题本入口（错题由提交判分自动收录） */}
          <Button
            type="button"
            variant="outline"
            size="md"
            className="h-11 w-full md:h-10 md:w-auto"
            onClick={() => {
              void navigate('/mistakes')
            }}
          >
            我的错题
          </Button>
        </div>
      </section>

      {/*
        未完成的练习提示。
        **没有未完成练习时整块不渲染** —— 首页的留白比一条「暂无」占位更有价值。
        数据源是 `practice_sessions`（RLS 限本人、不含答案列），不是统计 RPC：
        首页只需要知道「有没有、叫什么、要不要继续」，不需要分数。
      */}
      {pending.length > 0 ? (
        <section className="mt-4 border-t pt-8" aria-labelledby="home-incomplete-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2
              id="home-incomplete-title"
              className="font-heading text-lg font-semibold"
            >
              未完成的练习
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {incomplete.data?.length ?? 0} 项
              </span>
            </h2>
            <Link
              to="/records"
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              查看练习记录
            </Link>
          </div>

          <ul className="mt-4 flex list-none flex-col gap-3">
            {pending.map((session) => {
              const target = resumeTarget(session)
              return (
                <li key={session.id}>
                  <Card className="border-primary-soft-border bg-primary-selected">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {recordTitle(
                            {
                              sessionType: session.sessionType,
                              paperId: session.paperId,
                              paperYear: null,
                              paperTitle: null,
                              sectionType: null,
                              drillType: session.drillType,
                              drillYears: session.drillYears,
                            },
                            paperNameById,
                          )}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {statusLabel(session.status)} · 已用{' '}
                          {formatDuration(session.elapsedSeconds)} · 更新于{' '}
                          {formatTimestamp(session.updatedAt)}
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
                          <ArrowRight
                            aria-hidden="true"
                            className="size-4"
                            strokeWidth={1.5}
                          />
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </main>
  )
}
