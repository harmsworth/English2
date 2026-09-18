import { cn } from '@/lib/utils'

/**
 * 题号导航（design-system §8.9 QuestionTile）。
 *
 * - 桌面：右侧 sticky 卡片，按大题分组的题号网格，点击切题
 * - 移动：内容区上方的横向滚动条（同样点击切题）
 *
 * 三态必须**同时**可辨：当前题（primary 底 + 白字）、已作答（primary-soft 底）、
 * 未作答（中性底）—— 并配图例，不靠颜色单独表意（§3.3）。
 */

export type NavigatorQuestion = {
  /** 全卷序号，从 1 开始 */
  globalNo: number
  /** 该题在整个序列中的下标，用于跳转 */
  index: number
  /** 大题内的小题号，展示用 */
  itemNo: number
}

export type NavigatorGroup = {
  key: string
  label: string
  questions: NavigatorQuestion[]
}

const TILE =
  'flex size-[38px] shrink-0 items-center justify-center rounded-[7px] text-[11px] font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

function tileClass(state: 'current' | 'answered' | 'unanswered') {
  if (state === 'current') return 'bg-primary text-white'
  if (state === 'answered') return 'bg-primary-soft text-primary hover:bg-primary-soft-border'
  return 'bg-neutral-soft text-neutral-soft-foreground hover:bg-border'
}

function Legend() {
  const items = [
    { label: '当前', className: 'bg-primary' },
    { label: '已答', className: 'bg-primary-soft' },
    { label: '未答', className: 'bg-neutral-soft' },
  ]
  return (
    <ul className="mt-4 flex list-none flex-wrap items-center gap-x-4 gap-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn('size-2.5 rounded-full border border-border', item.className)}
          />
          <span className="text-[11px] text-muted-foreground">{item.label}</span>
        </li>
      ))}
    </ul>
  )
}

export function QuestionNavigator({
  groups,
  currentIndex,
  answeredIndices,
  onSelect,
  variant,
}: {
  groups: NavigatorGroup[]
  currentIndex: number
  answeredIndices: ReadonlySet<number>
  onSelect: (index: number) => void
  variant: 'sidebar' | 'bar'
}) {
  const stateOf = (index: number) =>
    index === currentIndex
      ? 'current'
      : answeredIndices.has(index)
        ? 'answered'
        : 'unanswered'

  if (variant === 'bar') {
    return (
      <div className="flex items-center gap-3 overflow-x-auto pb-1">
        {groups.map((group) => (
          <div key={group.key} className="flex shrink-0 items-center gap-1.5">
            <span className="text-[10px] font-bold tracking-[0.6px] text-subtle-foreground uppercase">
              {group.label}
            </span>
            {group.questions.map((question) => (
              <button
                key={question.globalNo}
                type="button"
                onClick={() => onSelect(question.index)}
                aria-current={question.index === currentIndex ? 'true' : undefined}
                aria-label={`第 ${question.globalNo} 题`}
                className={cn(TILE, tileClass(stateOf(question.index)))}
              >
                {question.itemNo}
              </button>
            ))}
          </div>
        ))}
      </div>
    )
  }

  return (
    <nav aria-label="题号导航" className="flex flex-col">
      <p className="text-[10px] font-bold tracking-[1.2px] text-subtle-foreground uppercase">
        Questions
      </p>

      <div className="mt-3 flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.key}>
            <p className="mb-2 text-[11px] font-semibold text-muted-foreground">
              {group.label}
            </p>
            <div className="grid grid-cols-5 gap-2">
              {group.questions.map((question) => (
                <button
                  key={question.globalNo}
                  type="button"
                  onClick={() => onSelect(question.index)}
                  aria-current={question.index === currentIndex ? 'true' : undefined}
                  aria-label={`第 ${question.globalNo} 题`}
                  className={cn(TILE, tileClass(stateOf(question.index)))}
                >
                  {question.itemNo}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Legend />
    </nav>
  )
}
