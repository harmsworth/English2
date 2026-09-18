import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { ExamItemWithOptions } from '@/services/exams'
import type { PracticeGradeResult } from '@/services/practice'
import { cn } from '@/lib/utils'

/**
 * 判分结果（Phase 6 Goal 6.1）。presentational：只渲染已下发的结果，不请求任何数据。
 *
 * 数据来源是 `grade_practice_section` RPC —— 里面**只包含本次会话实际作答过的题**，
 * 因此这里渲染多少题，就等于用户答了多少题；未作答题不会、也不应该出现。
 *
 * ⚠️ 本组件会渲染正确答案与解析，这是**提交后**才发生的、刻意的产品行为。
 * 作答过程中本组件不参与渲染。
 */

const LETTERS = 'ABCDEFGH'

/**
 * 选项标签。与 `PracticeQuestion` 的实现一致：题面自带「A. 」前缀就原样用，否则按下标生成。
 * 这里没有抽成公共 util，是因为只有这两处需要，且抽出去会碰 `only-export-components` 规则。
 */
function optionLabel(content: string, index: number): string {
  if (/^\s*[A-J]\s*[.)]/.test(content)) return content
  return `${LETTERS[index] ?? String(index + 1)}. ${content}`
}

/** 统计块（design-system §8.11）：标签 eyebrow + 数值 serif，正向指标用 success。 */
function StatBlock({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'success' | 'danger' | 'neutral'
}) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-3 text-center">
      <p className="text-[10px] font-bold tracking-[0.6px] text-subtle-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          'mt-1 font-heading text-2xl leading-none font-semibold tabular-nums',
          tone === 'success' && 'text-success',
          tone === 'danger' && 'text-destructive',
          tone === 'neutral' && 'text-foreground',
        )}
      >
        {value}
      </p>
    </div>
  )
}

export function PracticeResult({
  items,
  results,
  totalItemCount,
  textAnswers,
  labels,
}: {
  items: ExamItemWithOptions[]
  results: PracticeGradeResult[]
  /** 本大题/全卷总题数，用于算出「未作答」数量 */
  totalItemCount: number
  /**
   * itemId → 用户的主观题输入。
   * 判分 RPC 的返回列里**没有** `text_answer`（只有参考译文），
   * 所以「我的译文 / 我的作文」只能从会话已保存的作答里取。
   */
  textAnswers?: Record<string, string>
  /**
   * itemId → 题号显示文案。
   *
   * 跨大题的练习（整卷 / 题型练习）里 `item_no` 是**大题内**序号，
   * 直接渲染会连着出现四个「第 1 题」；那种场景由调用方传入
   * 「第 N 题 · 所属大题」，本页单大题练习不传，保持原样。
   */
  labels?: Record<string, string>
}) {
  const itemById = new Map(items.map((item) => [item.id, item]))

  const objective = results.filter((r) => r.isCorrect !== null)
  const correctCount = objective.filter((r) => r.isCorrect === true).length
  const wrongCount = objective.filter((r) => r.isCorrect === false).length
  const unanswered = Math.max(0, totalItemCount - results.length)

  /** 正确率按**已判分的客观题**为分母 —— 未作答的题不该拉低或抬高它。 */
  const accuracy =
    objective.length > 0
      ? Math.round((correctCount / objective.length) * 100)
      : 0

  return (
    <div className="flex flex-col gap-8">
      {/* Hero：大分数 + 三个统计块（design-system §8.11 StatBlock） */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-8">
          <div>
            <p className="text-[10px] font-bold tracking-[1.2px] text-subtle-foreground uppercase">
              {objective.length > 0 ? 'Accuracy' : 'Submitted'}
            </p>
            <p className="mt-2 font-heading text-[2.5rem] leading-none font-semibold tabular-nums">
              {objective.length > 0 ? `${accuracy}%` : `${results.length}`}
              {objective.length === 0 ? (
                <span className="ml-1 text-base font-medium text-muted-foreground">
                  题
                </span>
              ) : null}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              已作答 {results.length} / {totalItemCount} 题
            </p>
          </div>

          <div className="grid w-full grid-cols-3 gap-3 md:w-auto">
            <StatBlock label="答对" value={correctCount} tone="success" />
            <StatBlock label="答错" value={wrongCount} tone="danger" />
            <StatBlock label="未作答" value={unanswered} tone="neutral" />
          </div>
        </CardContent>
      </Card>

      {objective.length === 0 ? (
        // 全主观题（如翻译大题）：报「答对 0 题 · 答错 0 题」是无意义的，直接说明不判分
        <p className="text-sm text-muted-foreground">
          本大题只有主观题，不判分，提交后直接对照参考内容。
        </p>
      ) : null}

      {unanswered > 0 ? (
        <p className="text-xs text-muted-foreground">
          未作答 {unanswered} 题，不参与判分，也不会显示答案。
        </p>
      ) : null}

      <h2 className="font-heading text-[19px] font-semibold">逐题回顾</h2>

      <ol className="flex list-none flex-col gap-4">
        {results.map((result) => {
          const item = itemById.get(result.itemId)
          const isChoice = result.itemType === 'choice'
          const isCorrect = result.isCorrect

          const myOption =
            result.selectedOption !== null
              ? item?.options.find((o) => o.option_index === result.selectedOption)
              : undefined
          const rightOption =
            result.correctOption !== null
              ? item?.options.find((o) => o.option_index === result.correctOption)
              : undefined

          return (
            <li
              key={result.itemId}
              className="rounded-lg border border-border bg-card px-4 py-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-sm font-medium text-foreground">
                  {labels?.[result.itemId] ?? `第 ${result.itemNo} 题`}
                </span>
                {isChoice ? (
                  // 徽章带文字，不靠颜色单独表意（design-system §3.3）
                  <Badge
                    variant={
                      isCorrect === true
                        ? 'success'
                        : isCorrect === false
                          ? 'danger'
                          : 'neutral'
                    }
                  >
                    {isCorrect === true
                      ? '答对'
                      : isCorrect === false
                        ? '答错'
                        : '未判分'}
                  </Badge>
                ) : (
                  <Badge variant="neutral">主观题</Badge>
                )}
              </div>

              {item?.content ? (
                <p className="mt-2 whitespace-pre-line wrap-anywhere text-[0.9375rem] leading-7 text-foreground/90">
                  {item.content}
                </p>
              ) : null}

              {isChoice ? (
                // 「你的选择 / 正确答案」的配色口径与练习页选区、错题本一致：
                // 选中=答案 → 绿；选中≠答案 → 红；正确答案本身就是绿。
                <dl className="mt-3 flex flex-col gap-1.5 text-sm">
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-muted-foreground">你的选择：</dt>
                    <dd
                      className={cn(
                        'wrap-anywhere',
                        isCorrect === true ? 'text-success' : '',
                        isCorrect === false ? 'text-destructive' : '',
                      )}
                    >
                      {myOption
                        ? optionLabel(myOption.content, myOption.option_index)
                        : '未作答'}
                    </dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-muted-foreground">正确答案：</dt>
                    <dd className="wrap-anywhere text-success">
                      {rightOption
                        ? optionLabel(
                            rightOption.content,
                            rightOption.option_index,
                          )
                        : '—'}
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="mt-3 flex flex-col gap-2">
                  {textAnswers?.[result.itemId] ? (
                    <div className="rounded-lg bg-muted/40 px-3 py-3">
                      <p className="text-xs font-medium tracking-wide text-muted-foreground">
                        我的作答
                      </p>
                      <p className="mt-1.5 wrap-anywhere whitespace-pre-line text-sm leading-7 text-foreground/90">
                        {textAnswers[result.itemId]}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      未记录作答内容。
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    主观题不判分，可对照参考内容自查。
                  </p>
                </div>
              )}

              {result.explanation ? (
                <div className="mt-3 rounded-lg bg-muted/40 px-3 py-3">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground">
                    解析
                  </p>
                  <p className="mt-1.5 whitespace-pre-line wrap-anywhere text-sm leading-7 text-muted-foreground">
                    {result.explanation}
                  </p>
                </div>
              ) : isChoice && isCorrect !== null ? (
                // 没有解析时给明确文案，不留空白（Phase 6 §12）
                <p className="mt-3 text-xs text-muted-foreground">
                  本题暂无解析。
                </p>
              ) : null}

              {result.referenceTranslation ? (
                <div className="mt-3 rounded-lg bg-muted/40 px-3 py-3">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground">
                    参考译文
                  </p>
                  <p className="mt-1.5 whitespace-pre-line wrap-anywhere text-sm leading-7 text-muted-foreground">
                    {result.referenceTranslation}
                  </p>
                </div>
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
