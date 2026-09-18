import { ChevronDown } from 'lucide-react'
import { Icon } from '@/components/ui/icon'
import { ChartFigure } from '@/components/exams/ChartFigure'
import { PassageText } from '@/components/exams/PassageText'
import { cn } from '@/lib/utils'
import type { RunnerStem } from './PracticeRunner'

/**
 * 答题时的**大题题干**（原文 / 题目要求 / 指导语 / 写作要点 / 图表）。
 *
 * 为什么必须有它：练习页一次只显示一道小题，而小题内容通常只是一句提问
 * （「According to Paragraph 3…」）—— 原文、写作要求这些都挂在大题上。
 * 之前展平题目序列时把它们丢了，用户在答题页只能对着残句硬猜，这是**设计缺陷**。
 *
 * 数据全部来自**已经下发的公开字段**（`intro` / `passage` / `prompt` / `tips`
 * 与大题级 `extra_data` 里的 `chart`），没有新增任何查询，也没放宽答案边界：
 * - 不碰 `passage_zh` / `source_data`；
 * - 不读小题级 `extra_data`（翻译参考译文藏在那里）；
 * - 不渲染大题 `extra_data` 里的 `sample`（参考范文 = 答案，答题时不能看到）。
 *
 * 交互：默认**收起**（移动端一屏放不下 2400 字的原文，收起才能留出答题区），
 * 展开状态由 `PracticeRunner` 按**大题**记住 —— 同一篇阅读的 5 道题只需展开一次。
 */
export function QuestionStem({
  stem,
  open,
  onToggle,
  itemContent,
}: {
  stem: RunnerStem
  open: boolean
  onToggle: () => void
  /** 当前小题题面：与它完全重复的大题 passage / prompt 不再渲染第二遍 */
  itemContent?: string | null
}) {
  // 与详情页同一套去重口径：组级长文若与唯一主观小题的 content 相同，只渲染一次。
  const normalize = (value: string | null | undefined) =>
    (value ?? '').replace(/\s+/g, ' ').trim()
  const current = normalize(itemContent)

  const isDuplicate = (value: string | null) => {
    if (!value) return false
    const text = normalize(value)
    return text !== '' && text === current
  }

  const intro = stem.intro
  const passage = stem.passage && !isDuplicate(stem.passage) ? stem.passage : null
  const prompt = stem.prompt && !isDuplicate(stem.prompt) ? stem.prompt : null
  const tips = stem.tips
  const hasChart = Boolean(stem.chart || stem.chartUrl || stem.chartFlag)

  if (!intro && !passage && !prompt && !tips && !hasChart) return null

  // 折叠时用一句话说清里面是什么，别让用户盲点。
  const summary = passage
    ? stem.sectionType === '完形填空'
      ? '完形原文'
      : '英文原文'
    : prompt
      ? '题目要求'
      : '大题说明'

  return (
    <div className="rounded-lg border border-border bg-muted/40">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="min-w-0">
          <span className="block text-xs font-medium tracking-wide text-muted-foreground">
            {stem.sectionTitle ? `${stem.sectionTitle} · ` : ''}
            {stem.sectionType}
          </span>
          <span className="mt-0.5 block text-sm font-medium text-foreground">
            {summary}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-primary">
          {open ? '收起' : '展开'}
          <Icon
            icon={ChevronDown}
            size={16}
            strokeWidth={1.5}
            className={cn('transition-transform duration-150', open && 'rotate-180')}
          />
        </span>
      </button>

      {open ? (
        <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
          {intro ? (
            <p className="whitespace-pre-line wrap-anywhere text-[0.9375rem] leading-7 text-muted-foreground">
              {intro}
            </p>
          ) : null}

          {passage ? (
            <PassageText text={passage} label="英文原文" />
          ) : null}

          {prompt ? <PassageText text={prompt} label="题目要求" /> : null}

          <ChartFigure
            chart={stem.chart}
            chartUrl={stem.chartUrl}
            chartFlag={stem.chartFlag}
            alt={`${stem.sectionTitle || stem.sectionType} 图表`}
          />

          {tips ? (
            <div className="rounded-lg border border-border bg-card px-4 py-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground">
                写作要点
              </p>
              <p className="mt-2 whitespace-pre-line wrap-anywhere text-sm leading-7 text-muted-foreground">
                {tips}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
