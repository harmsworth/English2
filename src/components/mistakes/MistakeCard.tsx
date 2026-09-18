import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { MistakeItem, MistakeStatus } from '@/services/mistakes'

/** 选项序号：A、B、C…（题库最多 7 项，超出字母范围退回数字）。 */
function optionLetter(optionIndex: number): string {
  return optionIndex >= 0 && optionIndex < 26
    ? String.fromCharCode(65 + optionIndex)
    : String(optionIndex + 1)
}

/** 文本自带的序号字母（部分年份选项自带 `A. ` 前缀），取到就不再重复加序号。 */
function hasOwnLetter(content: string): boolean {
  return /^\s*[A-Z][.、]\s/.test(content)
}

/** 本地时间 `YYYY-MM-DD HH:mm`；不依赖 locale，也不做时区换算猜测。 */
function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const STATUS_LABEL: Readonly<Record<MistakeStatus, string>> = {
  active: '未掌握',
  reviewing: '复习中',
  mastered: '已掌握',
  removed: '已移出',
}

/** 状态 → Badge 变体（design-system §8.3）：徽章一律带文字，不靠颜色单独表意。 */
const STATUS_VARIANT: Readonly<
  Record<MistakeStatus, 'neutral' | 'warning' | 'success' | 'danger'>
> = {
  active: 'danger',
  reviewing: 'warning',
  mastered: 'success',
  removed: 'neutral',
}

/**
 * 一条错题卡片（presentational，无请求）。
 *
 * **不渲染正确答案与解析**（`correct_option` / `explanation` / `reference_translation`
 * 根本不在 DTO 里）。要看到答案只能走「重做 → 判分」，本 Phase 尚未提供重做入口。
 *
 * 「我上次选的」高亮来自 `lastSelectedOption`（用户自己的作答记录），不是答案。
 */
export function MistakeCard({
  mistake,
  isMutating,
  errorText,
  onStatusChange,
}: {
  mistake: MistakeItem
  isMutating: boolean
  /** 该卡片最近一次状态切换失败的归一化文案；无错误时为 undefined */
  errorText?: string
  onStatusChange: (next: MistakeStatus) => void
}) {
  const { status, lastSelectedOption } = mistake

  const canMaster = status === 'active' || status === 'reviewing'
  const canRemove =
    status === 'active' || status === 'reviewing' || status === 'mastered'
  const canUndo = status === 'mastered' || status === 'removed'

  const source = [
    mistake.paperYear === null ? mistake.paperTitle : `${mistake.paperYear} 年真题`,
    mistake.sectionTitle,
    `第 ${mistake.itemNo} 题`,
  ].filter((part): part is string => Boolean(part))

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="text-xs text-muted-foreground">
            {source.join(' · ')}
          </p>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={STATUS_VARIANT[status]}>
              {STATUS_LABEL[status]}
            </Badge>
            <span className="tabular-nums">
              最近错 {formatDateTime(mistake.lastWrongAt)}
            </span>
          </p>
        </div>

        <p className="whitespace-pre-line wrap-anywhere text-[0.9375rem] leading-7">
          {mistake.content}
        </p>

        {mistake.options.length === 0 ? (
          <p className="text-sm text-muted-foreground">本题未收录选项。</p>
        ) : (
          <ul className="flex list-none flex-col gap-1.5">
            {mistake.options.map((option) => {
              const picked = lastSelectedOption === option.option_index
              return (
                <li
                  key={option.id}
                  className={cn(
                    'flex flex-wrap items-baseline gap-2.5 rounded-md px-2 py-1 text-[0.9375rem] leading-7 text-foreground/85',
                    picked && 'bg-primary-selected ring-1 ring-primary/40',
                  )}
                >
                  {hasOwnLetter(option.content) ? null : (
                    <span className="w-5 shrink-0 font-medium text-muted-foreground">
                      {optionLetter(option.option_index)}.
                    </span>
                  )}
                  <span className="wrap-anywhere">{option.content}</span>
                  {picked ? (
                    <span className="text-xs font-medium text-primary">
                      我上次选的
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            首次错 {formatDateTime(mistake.firstWrongAt)} · 重做{' '}
            {mistake.reviewCount} 次
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {canUndo ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                // 移动端补足 44px 触控高度，桌面回到紧凑档（WCAG 2.5.5）
                className="h-11 px-3 md:h-7 md:px-2.5"
                disabled={isMutating}
                onClick={() => onStatusChange('active')}
              >
                撤销
              </Button>
            ) : null}
            {canMaster ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                // 移动端补足 44px 触控高度，桌面回到紧凑档（WCAG 2.5.5）
                className="h-11 px-3 md:h-7 md:px-2.5"
                disabled={isMutating}
                onClick={() => onStatusChange('mastered')}
              >
                标记已掌握
              </Button>
            ) : null}
            {canRemove ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                // 移动端补足 44px 触控高度，桌面回到紧凑档（WCAG 2.5.5）
                className="h-11 px-3 md:h-7 md:px-2.5"
                disabled={isMutating}
                onClick={() => onStatusChange('removed')}
              >
                移出错题本
              </Button>
            ) : null}
            {mistake.paperId ? (
              <Link
                to={`/exams/${mistake.paperId}`}
                className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
              >
                去试卷详情
              </Link>
            ) : null}
          </div>
        </div>

        {errorText ? (
          <p className="text-xs text-destructive" role="alert">
            {errorText}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
