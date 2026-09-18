import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MistakeCard } from '@/components/mistakes/MistakeCard'
import { READING_CONTAINER } from '@/components/layout/app-shell'
import { useMistakes, useUpdateMistakeStatus } from '@/hooks/use-mistakes'
import {
  groupOfStatus,
  toMistakeErrorMessage,
  type MistakeGroup,
} from '@/services/mistakes'
import { cn } from '@/lib/utils'

/**
 * 错题本（Phase 7 Goal 7.2 / 7.4）。
 *
 * 数据链路：Page → useMistakes/useUpdateMistakeStatus → mistakes service → Supabase。
 *
 * 边界：本页**不展示正确答案与解析** —— 答案的唯一受控出口是判分 RPC（提交后按题下发），
 * 错题页若能直接展示答案就等于绕过那道出口。要对照答案只能等「重做 → 判分」（Goal 7.3）。
 * 错题记录由服务端判分 RPC 自动收录，前端只改 `status`（已掌握 / 已移出 / 撤销）。
 */

const GROUPS: readonly MistakeGroup[] = ['open', 'mastered', 'removed']

const GROUP_LABEL: Readonly<Record<MistakeGroup, string>> = {
  open: '未掌握',
  mastered: '已掌握',
  removed: '已移出',
}

const EMPTY_HINT: Readonly<Record<MistakeGroup, string>> = {
  open: '还没有未掌握的错题。',
  mastered: '还没有标记为已掌握的错题。',
  removed: '还没有移出错题本的记录。',
}

function FullScreen({ text }: { text: string }) {
  return (
    <main className="flex min-h-svh items-center justify-center px-5">
      <p className="text-sm text-muted-foreground">{text}</p>
    </main>
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

export default function MistakesPage() {
  const { data, isPending, isError, error, refetch } = useMistakes()
  const updateStatus = useUpdateMistakeStatus()
  const [group, setGroup] = useState<MistakeGroup>('open')

  // `data ?? []` 每次渲染都是新数组，会让下面的 useMemo 依赖失效（并触发 exhaustive-deps 告警）。
  const mistakes = useMemo(() => data ?? [], [data])

  const counts = useMemo(() => {
    const result: Record<MistakeGroup, number> = {
      open: 0,
      mastered: 0,
      removed: 0,
    }
    for (const mistake of mistakes) {
      result[groupOfStatus(mistake.status)] += 1
    }
    return result
  }, [mistakes])

  const visible = useMemo(
    () => mistakes.filter((mistake) => groupOfStatus(mistake.status) === group),
    [mistakes, group],
  )

  // 只让「正在改的那张卡」进入 pending，不要整页锁死。
  const mutatingId = updateStatus.isPending
    ? updateStatus.variables?.mistakeId
    : undefined
  const failedId = updateStatus.isError
    ? updateStatus.variables?.mistakeId
    : undefined
  const failureText = updateStatus.isError
    ? toMistakeErrorMessage(updateStatus.error)
    : undefined

  if (isPending) return <FullScreen text="正在加载错题…" />

  if (isError) {
    return (
      <main className={`${READING_CONTAINER} py-12`}>
        <p className="text-[10px] font-bold tracking-[1.2px] text-subtle-foreground uppercase">
          Mistake Book
        </p>
        <h1 className="mt-3 font-heading text-2xl leading-tight font-semibold md:text-[2.5rem]">
          我的错题
        </h1>
        <StateCard
          title="错题加载失败"
          // 底层错误结构只在 service 层解读，页面只负责展示这句话。
          description={toMistakeErrorMessage(error)}
          onRetry={() => {
            void refetch()
          }}
        />
      </main>
    )
  }

  return (
    <main className={`${READING_CONTAINER} py-12`}>
      <p className="text-[10px] font-bold tracking-[1.2px] text-subtle-foreground uppercase">
        Mistake Book
      </p>
      <h1 className="mt-3 font-heading text-2xl leading-tight font-semibold md:text-[2.5rem]">
        我的错题
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {mistakes.length > 0
          ? `共 ${mistakes.length} 条，按最近答错时间排列。这里不显示正确答案与解析。`
          : '做错的客观题会自动收进这里。'}
      </p>

      {mistakes.length === 0 ? (
        <StateCard
          title="还没有错题"
          description="做完一个大题并提交判分后，答错的客观题会自动收进这里。"
        />
      ) : (
        <>
          <div
            role="tablist"
            aria-label="错题分类"
            className="mt-8 flex flex-wrap items-center gap-2"
          >
            {GROUPS.map((item) => {
              const active = item === group
              return (
                <button
                  key={item}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    setGroup(item)
                  }}
                  className={cn(
                    // 移动端补足 44px 触控高度（WCAG 2.5.5），桌面回到紧凑档
                    'inline-flex h-11 items-center rounded-md border px-4 text-sm font-medium transition-colors tabular-nums md:h-9 md:px-3',
                    active
                      ? 'border-primary-soft-border bg-primary-soft text-primary'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground',
                  )}
                >
                  {GROUP_LABEL[item]} {counts[item]}
                </button>
              )
            })}
          </div>

          {visible.length === 0 ? (
            <StateCard title="这个分类下没有错题" description={EMPTY_HINT[group]} />
          ) : (
            <ul className="mt-6 flex list-none flex-col gap-4">
              {visible.map((mistake) => (
                <li key={mistake.mistakeId}>
                  <MistakeCard
                    mistake={mistake}
                    isMutating={mutatingId === mistake.mistakeId}
                    errorText={
                      failedId === mistake.mistakeId ? failureText : undefined
                    }
                    onStatusChange={(next) => {
                      updateStatus.mutate({
                        mistakeId: mistake.mistakeId,
                        status: next,
                      })
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  )
}
