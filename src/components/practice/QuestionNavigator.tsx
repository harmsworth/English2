import { cn } from '@/lib/utils'

/**
 * 题号导航（design-system §8.9 QuestionTile）。
 *
 * - 桌面：右侧 sticky 卡片，按大题分组的题号网格，点击切题（本文件的 `QuestionNavigator`）。
 * - 移动：改为**底部抽屉「答题卡」**（见 `AnswerSheet.tsx`，design-system §8.14 / §9 规则 4），
 *   不再是内容上方那条单行横滚条。
 *
 * 桌面栏与移动抽屉共用这里的 `QuestionTile` / `NavigatorLegend`，避免两套实现漂移。
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

export type TileState = 'current' | 'answered' | 'unanswered'

const TILE =
  'flex size-[38px] shrink-0 items-center justify-center rounded-[7px] text-[11px] font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50'

function tileClass(state: TileState) {
  if (state === 'current') return 'bg-primary text-white'
  if (state === 'answered') return 'bg-primary-soft text-primary hover:bg-primary-soft-border'
  return 'bg-neutral-soft text-neutral-soft-foreground hover:bg-border'
}

/** 单个题号格子：桌面栏与移动答题卡共用。`data-current` 供抽屉打开时滚动定位当前题。 */
export function QuestionTile({
  index,
  displayNo,
  globalNo,
  state,
  onSelect,
  className,
}: {
  index: number
  displayNo: number
  globalNo: number
  state: TileState
  onSelect: (index: number) => void
  /** 覆盖尺寸（如移动端 7 列里 `w-full` 拉伸填满单元格）；经 twMerge 生效。 */
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      aria-current={state === 'current' ? 'true' : undefined}
      aria-label={`第 ${globalNo} 题`}
      data-current={state === 'current' ? 'true' : undefined}
      className={cn(TILE, tileClass(state), className)}
    >
      {displayNo}
    </button>
  )
}

/** 三态图例（§3.3：不靠颜色单独表意）。 */
export function NavigatorLegend({ className }: { className?: string }) {
  const items = [
    { label: '当前', className: 'bg-primary' },
    { label: '已答', className: 'bg-primary-soft' },
    { label: '未答', className: 'bg-neutral-soft' },
  ]
  return (
    <ul className={cn('flex list-none flex-wrap items-center gap-x-4 gap-y-2', className)}>
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

/** 桌面右侧「题号导航」栏：按大题分组的网格 + 图例。 */
export function QuestionNavigator({
  groups,
  currentIndex,
  answeredIndices,
  onSelect,
}: {
  groups: NavigatorGroup[]
  currentIndex: number
  answeredIndices: ReadonlySet<number>
  onSelect: (index: number) => void
}) {
  const stateOf = (index: number): TileState =>
    index === currentIndex
      ? 'current'
      : answeredIndices.has(index)
        ? 'answered'
        : 'unanswered'

  return (
    <nav aria-label="题号导航" className="flex flex-col">
      <p className="text-[10px] font-bold tracking-[1.2px] text-subtle-foreground uppercase">
        Questions
      </p>

      <div className="mt-3 flex flex-col gap-5">
        {groups.map((group) => (
          <div key={group.key}>
            <p className="mb-2 text-[11px] font-semibold text-muted-foreground">{group.label}</p>
            <div className="grid grid-cols-5 gap-2">
              {group.questions.map((question) => (
                <QuestionTile
                  key={question.globalNo}
                  index={question.index}
                  displayNo={question.itemNo}
                  globalNo={question.globalNo}
                  state={stateOf(question.index)}
                  onSelect={onSelect}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <NavigatorLegend className="mt-4" />
    </nav>
  )
}
