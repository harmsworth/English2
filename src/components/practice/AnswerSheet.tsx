import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Sheet } from '@/components/ui/sheet'
import {
  NavigatorLegend,
  QuestionTile,
  type NavigatorGroup,
} from '@/components/practice/QuestionNavigator'

/**
 * 移动端「答题卡」底部抽屉（design-system §8.14 Sheet / §9 规则 4）。
 *
 * 取代旧的「内容上方单行横滚条」：从底部升起的抽屉里放**分组 7 列网格 + 图例 + 进度**，
 * 打开时自动滚到当前题，点题号跳转并收起，底部主按钮提交。桌面不受影响（右侧栏仍常驻）。
 *
 * ⚠️ 只读呈现 + 回调：不碰判分/落库逻辑，`onSelect`/`onSubmit` 由 `PracticeRunner` 提供。
 */
export function AnswerSheet({
  open,
  onOpenChange,
  groups,
  currentIndex,
  answeredIndices,
  onSelect,
  onSubmit,
  answeredCount,
  total,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groups: NavigatorGroup[]
  currentIndex: number
  answeredIndices: ReadonlySet<number>
  onSelect: (index: number) => void
  onSubmit: () => void
  answeredCount: number
  total: number
}) {
  const bodyRef = useRef<HTMLDivElement>(null)

  // 每次打开 / 当前题变化时，把当前题滚进视野（题多时抽屉内会滚动）。
  useEffect(() => {
    if (!open) return
    const el = bodyRef.current?.querySelector<HTMLElement>('[data-current="true"]')
    el?.scrollIntoView({ block: 'center' })
  }, [open, currentIndex])

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="答题卡">
      {/* 头部：标题 + 已作答计数 + 细进度条（§8.14 节奏：标题 → 进度 → 网格 → 图例 → 主按钮） */}
      <div className="flex items-baseline justify-between gap-3 px-5 pt-1 pb-2">
        <h2 className="font-heading text-[17px] font-semibold text-foreground">答题卡</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          已作答 {answeredCount}/{total}
        </span>
      </div>
      <div className="px-5 pb-3">
        <Progress value={answeredCount} max={total} />
      </div>

      {/* 分组题号网格：7 列、多行换行，tile 拉伸填满单元格 */}
      <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-5">
        <div className="flex flex-col gap-4 pb-2">
          {groups.map((group) => (
            <div key={group.key}>
              <p className="mb-2 text-[11px] font-semibold text-muted-foreground">
                {group.label}
              </p>
              <div className="grid grid-cols-7 gap-2">
                {group.questions.map((question) => (
                  <QuestionTile
                    key={question.globalNo}
                    index={question.index}
                    displayNo={question.itemNo}
                    globalNo={question.globalNo}
                    state={
                      question.index === currentIndex
                        ? 'current'
                        : answeredIndices.has(question.index)
                          ? 'answered'
                          : 'unanswered'
                    }
                    onSelect={(index) => {
                      onSelect(index)
                      onOpenChange(false)
                    }}
                    className="size-auto h-10 w-full"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <NavigatorLegend className="mt-4" />
      </div>

      {/* 底部主按钮：提交（距底留白含安全区，§8.14） */}
      <div className="border-t border-border px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Button
          type="button"
          size="md"
          className="h-11 w-full"
          disabled={answeredCount === 0}
          onClick={() => {
            onOpenChange(false)
            onSubmit()
          }}
        >
          提交并查看结果
        </Button>
        {answeredCount === 0 ? (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            至少作答一题才能提交。
          </p>
        ) : null}
      </div>
    </Sheet>
  )
}
