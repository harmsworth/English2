import { useMemo, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MistakeSectionGroup } from '@/components/mistakes/MistakeSectionGroup'
import { READING_CONTAINER } from '@/components/layout/app-shell'
import { useMistakes, useUpdateMistakeStatus } from '@/hooks/use-mistakes'
import { groupMistakesBySection } from '@/lib/mistake-group'
import {
  groupOfStatus,
  toMistakeMessage,
  type MistakeGroup,
  type MistakeItem,
} from '@/services/mistakes'
import { cn } from '@/lib/utils'

/**
 * 错题本（Phase 7 Goal 7.2 / 7.4）。
 *
 * 数据链路：Page → useMistakes/useUpdateMistakeStatus/useRevealMistakeAnswer → mistakes service → Supabase。
 *
 * 边界：常规查询**不含**任何答案列；答案与解析由用户在卡片上**按需**点开，
 * 走服务端受控 RPC `peek_item_answer`（一次一题、校验会话归属），
 * 见 `services/mistakes.ts` 的 `revealMistakeAnswer`。列表**不做**批量预取。
 * 错题记录由服务端判分 RPC 自动收录，前端只改 `status`（已掌握 / 已移出 / 撤销）。
 *
 * 页面职责有三层，**顺序不能颠倒**：
 * 1. **筛选**（年份 / 题型）—— 决定看哪些错题；
 * 2. **分组 tab**（未掌握 / 已掌握 / 已移出）—— 决定看哪一类；
 * 3. **按大题归组**（`groupMistakesBySection`）—— 同一篇阅读的几道错题共用一个题干。
 * 先筛后组：反过来的话，被筛掉的题会在页面上留下一个空壳分组。
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

/** 从错题里派生出的可筛选项；用 Set 去重，避免同一项出现多次。 */
function collectYears(mistakes: readonly MistakeItem[]): number[] {
  const years = new Set<number>()
  for (const mistake of mistakes) {
    if (mistake.paperYear !== null) years.add(mistake.paperYear)
  }
  // 新的在前：复习时通常更关心最近做过的卷子
  return [...years].sort((a, b) => b - a)
}

function collectTypes(mistakes: readonly MistakeItem[]): string[] {
  const types = new Set<string>()
  for (const mistake of mistakes) {
    if (mistake.sectionType) types.add(mistake.sectionType)
  }
  return [...types].sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'))
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
  children,
}: {
  title: string
  description: string
  onRetry?: () => void
  children?: ReactNode
}) {
  return (
    <Card className="mt-8">
      <CardContent className="flex flex-col items-start gap-3">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
        {children}
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
 * 筛选 chip。与分组 tab 用同一套视觉语言（选中=primary-soft），
 * 但语义不同：tab 是「看哪一类」，chip 是「筛掉哪些」——
 * 所以 chip 用 `aria-pressed`（开关），tab 用 `aria-selected`（选择）。
 */
function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        // 移动端补足 44px 触控高度（WCAG 2.5.5），桌面回到紧凑档
        'inline-flex h-11 items-center rounded-full border px-3.5 text-sm transition-colors md:h-8 md:px-3',
        active
          ? 'border-primary-soft-border bg-primary-soft font-medium text-primary'
          : 'border-border bg-card text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start gap-2">
      <span className="mt-0.5 w-9 shrink-0 text-xs leading-6 text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  )
}

export default function MistakesPage() {
  const { data, isPending, isError, error, refetch } = useMistakes()
  const updateStatus = useUpdateMistakeStatus()
  const [group, setGroup] = useState<MistakeGroup>('open')
  const [year, setYear] = useState<number | null>(null)
  const [type, setType] = useState<string | null>(null)

  // `data ?? []` 每次渲染都是新数组，会让下面的 useMemo 依赖失效（并触发 exhaustive-deps 告警）。
  const mistakes = useMemo(() => data ?? [], [data])

  // 可选项一律从**全量**错题派生：若从筛选结果里派生，选中某一项之后
  // 其它选项会跟着消失，用户就再也切不回去了。
  const yearOptions = useMemo(() => collectYears(mistakes), [mistakes])
  const typeOptions = useMemo(() => collectTypes(mistakes), [mistakes])

  /** 通过年份 / 题型筛选后的集合；分组 tab 的计数与列表都基于它。 */
  const scoped = useMemo(
    () =>
      mistakes.filter(
        (mistake) =>
          (year === null || mistake.paperYear === year) &&
          (type === null || mistake.sectionType === type),
      ),
    [mistakes, year, type],
  )

  const counts = useMemo(() => {
    const result: Record<MistakeGroup, number> = {
      open: 0,
      mastered: 0,
      removed: 0,
    }
    for (const mistake of scoped) {
      result[groupOfStatus(mistake.status)] += 1
    }
    return result
  }, [scoped])

  const visible = useMemo(
    () => scoped.filter((mistake) => groupOfStatus(mistake.status) === group),
    [scoped, group],
  )

  /** 按大题归组 —— 同一大题的几道错题共用一个题干。 */
  const sections = useMemo(() => groupMistakesBySection(visible), [visible])

  const hasFilter = year !== null || type !== null
  const clearFilters = () => {
    setYear(null)
    setType(null)
  }

  // 只让「正在改的那张卡」进入 pending，不要整页锁死。
  const mutatingId = updateStatus.isPending
    ? updateStatus.variables?.mistakeId
    : undefined
  const failedId = updateStatus.isError
    ? updateStatus.variables?.mistakeId
    : undefined
  const failureText = updateStatus.isError
    ? toMistakeMessage(updateStatus.error)
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
          description={toMistakeMessage(error)}
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
          ? `共 ${mistakes.length} 条，按最近答错时间排列。同一大题的题干合并显示，答案与解析按需查看。`
          : '做错的客观题会自动收进这里。'}
      </p>

      {mistakes.length === 0 ? (
        <StateCard
          title="还没有错题"
          description="做完一个大题并提交判分后，答错的客观题会自动收进这里。"
        />
      ) : (
        <>
          {/* 筛选：只在有得选时才出现（只有一套卷 / 一种题型时，筛选没有意义） */}
          {yearOptions.length > 1 || typeOptions.length > 1 ? (
            <div className="mt-8 flex flex-col gap-2.5">
              {yearOptions.length > 1 ? (
                <FilterRow label="年份">
                  <FilterChip active={year === null} onClick={() => setYear(null)}>
                    全部
                  </FilterChip>
                  {yearOptions.map((item) => (
                    <FilterChip
                      key={item}
                      active={year === item}
                      onClick={() => {
                        setYear(year === item ? null : item)
                      }}
                    >
                      {item}
                    </FilterChip>
                  ))}
                </FilterRow>
              ) : null}

              {typeOptions.length > 1 ? (
                <FilterRow label="题型">
                  <FilterChip active={type === null} onClick={() => setType(null)}>
                    全部
                  </FilterChip>
                  {typeOptions.map((item) => (
                    <FilterChip
                      key={item}
                      active={type === item}
                      onClick={() => {
                        setType(type === item ? null : item)
                      }}
                    >
                      {item}
                    </FilterChip>
                  ))}
                </FilterRow>
              ) : null}

              {hasFilter ? (
                <p className="text-xs text-muted-foreground tabular-nums">
                  筛选后 {scoped.length} / {mistakes.length} 条
                </p>
              ) : null}
            </div>
          ) : null}

          <div
            role="tablist"
            aria-label="错题分类"
            className="mt-6 flex flex-wrap items-center gap-2"
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
            <StateCard
              title={
                hasFilter ? '当前筛选下没有错题' : '这个分类下没有错题'
              }
              description={
                hasFilter
                  ? '换个年份或题型，或清除筛选看看全部错题。'
                  : EMPTY_HINT[group]
              }
            >
              {hasFilter ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                >
                  清除筛选
                </Button>
              ) : null}
            </StateCard>
          ) : (
            <div className="mt-6 flex flex-col gap-8">
              {sections.map((section) => (
                <MistakeSectionGroup
                  key={section.key}
                  group={section}
                  mutatingId={mutatingId}
                  failedId={failedId}
                  failureText={failureText}
                  onStatusChange={(mistakeId, next) => {
                    updateStatus.mutate({ mistakeId, status: next })
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  )
}
