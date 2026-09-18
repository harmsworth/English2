import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { RevealedAnswer } from '@/components/exams/RevealedAnswer'
import { useRevealMistakeAnswer } from '@/hooks/use-mistakes'
import { hasOwnOptionLetter, optionLetter } from '@/lib/option-label'
import { cn } from '@/lib/utils'
import {
  toMistakeMessage,
  type MistakeItem,
  type MistakeStatus,
} from '@/services/mistakes'

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
 * 作答历史最多显示最近几次。
 *
 * 同一套卷反复练会有十几条记录，全铺开就把卡片淹了；截断处给一个「…」，
 * 让用户知道前面还有（数字本身仍是完整次数）。
 */
const MAX_ATTEMPT_CHIPS = 6

/**
 * 一条错题卡片。
 *
 * ⚠️ **不渲染大题题干** —— 题干按大题统一由 `MistakeSectionGroup` 渲染一次。
 * 卡片只负责这道小题自己的东西：题面、选项、作答历史、答案与解析、状态操作。
 *
 * 关于「同一道题错了好几次」：`mistakes` 是 **`UNIQUE(user_id, item_id)`**，
 * 一道题只有一条错题记录（重答错只会把「最近错」时间前移），所以**不会**出现
 * 两张卡片。两次不同的选择体现在这里的**作答历史**上：
 * 「作答 2 次 · 选错 1 次 · 选择：A → B」。揭示答案之前不知道哪次错，
 * 芯片保持中性色；揭示之后按对错着色（对=绿、错=红）。
 *
 * 「我选了什么」来自 `practice_answers`（用户自己的作答记录），不是答案；
 * 答案只在用户主动点开后进入组件状态，不做整页批量预取。
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
  const { status, attempts } = mistake

  // 每张卡片各自一份 mutation：loading / 结果 / 失败都是**按卡片**独立的。
  const reveal = useRevealMistakeAnswer()
  const answer = reveal.data ?? null
  const correctOption = answer?.correctOption ?? null
  /** 已知正确答案才能判对错；揭示之前一切「对/错」都是猜。 */
  const revealed = correctOption !== null

  const canMaster = status === 'active' || status === 'reviewing'
  const canRemove =
    status === 'active' || status === 'reviewing' || status === 'mastered'
  const canUndo = status === 'mastered' || status === 'removed'

  /** 最近一次选了什么（`attempts` 已是时间倒序） */
  const latest = attempts[0]?.selectedOption ?? null
  const everPicked = new Set(attempts.map((attempt) => attempt.selectedOption))
  /** 芯片按**时间正序**（旧 → 新）才读得像「经过」；只保留最近几次。 */
  const chronological = [...attempts].reverse().slice(-MAX_ATTEMPT_CHIPS)
  const truncated = attempts.length > MAX_ATTEMPT_CHIPS
  const wrongCount = revealed
    ? attempts.filter((attempt) => attempt.selectedOption !== correctOption).length
    : null

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          {/* 年份与大题标题已经由组头给过了，这里只说这是第几题 */}
          <p className="text-sm font-medium text-foreground">
            第 {mistake.itemNo} 题
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
              const picked = everPicked.has(option.option_index)
              const isCorrect = revealed && correctOption === option.option_index
              const isWrongPick = revealed && picked && !isCorrect
              // 还没揭示答案时无从判断对错，只用主色标出「最近选的」，
              // **不**用对错色冒充结论。
              const isLatestUnrevealed =
                !revealed && latest === option.option_index

              // 用户明确要求的口径：选中项与答案相同 → 绿；不同 → 红。
              const mark: { text: string; tone: string } | null = isCorrect
                ? { text: picked ? '正确答案 · 你选过' : '正确答案', tone: 'text-success' }
                : isWrongPick
                  ? { text: '你选错了', tone: 'text-danger' }
                  : picked
                    ? { text: '你选过', tone: 'text-muted-foreground' }
                    : null

              return (
                <li
                  key={option.id}
                  className={cn(
                    'flex flex-wrap items-baseline gap-2.5 rounded-md px-2 py-1 text-[0.9375rem] leading-7 text-foreground/85',
                    isCorrect && 'bg-success-soft ring-1 ring-success/40',
                    isWrongPick && 'bg-danger-soft ring-1 ring-danger/40',
                    isLatestUnrevealed &&
                      'bg-primary-selected ring-1 ring-primary/40',
                  )}
                >
                  {hasOwnOptionLetter(option.content) ? null : (
                    <span className="w-5 shrink-0 font-medium text-muted-foreground">
                      {optionLetter(option.option_index)}.
                    </span>
                  )}
                  <span className="wrap-anywhere">{option.content}</span>
                  {mark ? (
                    <span className={cn('text-xs font-medium', mark.tone)}>
                      {mark.text}
                    </span>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}

        {/* 作答历史：同一道题练过几遍、每遍选了什么、哪几遍是错的。
            对错标记要等答案揭示之后才出现 —— `is_correct` 对前端不可读，
            只能拿 `correctOption` 与历次选择自己比对。 */}
        {attempts.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            这题没有留下选择题作答记录。
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <span className="text-muted-foreground tabular-nums">
              作答 {attempts.length} 次
              {wrongCount === null ? '' : ` · 选错 ${wrongCount} 次`}
              {' · 选择：'}
            </span>
            {truncated ? (
              <span className="text-muted-foreground">…</span>
            ) : null}
            {chronological.map((attempt, index) => {
              const verdict =
                correctOption === null
                  ? null
                  : attempt.selectedOption === correctOption
                    ? 'correct'
                    : 'wrong'
              return (
                <Fragment key={attempt.sessionId}>
                  {index > 0 ? (
                    <span className="text-muted-foreground">→</span>
                  ) : null}
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 font-medium tabular-nums',
                      verdict === 'correct' && 'bg-success-soft text-success',
                      verdict === 'wrong' && 'bg-danger-soft text-danger',
                      verdict === null && 'bg-muted text-muted-foreground',
                    )}
                  >
                    {optionLetter(attempt.selectedOption)}
                  </span>
                </Fragment>
              )
            })}
          </div>
        )}

        {/* 答案与解析：默认不显示，点开才取（一次一题）。取回后一直留在卡片上。 */}
        {answer ? (
          <RevealedAnswer answer={answer} options={mistake.options} />
        ) : (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              // 移动端补足 44px 触控高度，桌面回到紧凑档（WCAG 2.5.5）
              className="h-11 px-3 md:h-8 md:px-3"
              disabled={reveal.isPending}
              onClick={() => reveal.mutate({ itemId: mistake.itemId })}
            >
              {reveal.isPending
                ? '读取中…'
                : reveal.isError
                  ? '重试'
                  : '查看答案与解析'}
            </Button>
            <p className="text-xs text-muted-foreground">
              一次只取这一题；答案由服务端受控接口下发。
            </p>
          </div>
        )}

        {reveal.isError ? (
          <p className="text-sm text-destructive" role="alert">
            {toMistakeMessage(reveal.error)}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t pt-3">
          <p className="text-xs text-muted-foreground">
            首次错 {formatDateTime(mistake.firstWrongAt)} · 重做{' '}
            {mistake.reviewCount} 次
          </p>

          <div className="flex flex-wrap items-center gap-2">
            {canUndo ? (
              <StatusButton
                disabled={isMutating}
                onClick={() => onStatusChange('active')}
              >
                撤销
              </StatusButton>
            ) : null}
            {canMaster ? (
              <StatusButton
                disabled={isMutating}
                onClick={() => onStatusChange('mastered')}
              >
                标记已掌握
              </StatusButton>
            ) : null}
            {canRemove ? (
              <StatusButton
                disabled={isMutating}
                onClick={() => onStatusChange('removed')}
              >
                移出错题本
              </StatusButton>
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

/** 卡片底部的状态操作按钮：三处只有文案与回调不同，样式必须一致。 */
function StatusButton({
  disabled,
  onClick,
  children,
}: {
  disabled: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      // 移动端补足 44px 触控高度，桌面回到紧凑档（WCAG 2.5.5）
      className="h-11 px-3 md:h-7 md:px-2.5"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}
