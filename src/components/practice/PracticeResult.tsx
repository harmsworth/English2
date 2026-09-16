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

export function PracticeResult({
  items,
  results,
  totalItemCount,
}: {
  items: ExamItemWithOptions[]
  results: PracticeGradeResult[]
  /** 本大题总题数，用于算出「未作答」数量 */
  totalItemCount: number
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
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-border bg-muted/40 px-4 py-4">
        <p className="text-sm font-medium text-foreground">
          已作答 {results.length} / {totalItemCount} 题
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          答对 {correctCount} 题 · 答错 {wrongCount} 题
          {objective.length > 0 ? ` · 正确率 ${accuracy}%` : ''}
        </p>
        {unanswered > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            未作答 {unanswered} 题，不参与判分，也不会显示答案。
          </p>
        ) : null}
      </div>

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
              className="rounded-xl border border-border px-4 py-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-sm font-medium text-foreground">
                  第 {result.itemNo} 题
                </span>
                {isChoice ? (
                  <span
                    className={cn(
                      'text-xs font-medium',
                      isCorrect === true
                        ? 'text-primary'
                        : isCorrect === false
                          ? 'text-destructive'
                          : 'text-muted-foreground',
                    )}
                  >
                    {isCorrect === true
                      ? '答对'
                      : isCorrect === false
                        ? '答错'
                        : '未判分'}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">主观题</span>
                )}
              </div>

              {item?.content ? (
                <p className="mt-2 whitespace-pre-line wrap-anywhere text-[0.9375rem] leading-7 text-foreground/90">
                  {item.content}
                </p>
              ) : null}

              {isChoice ? (
                <dl className="mt-3 flex flex-col gap-1.5 text-sm">
                  <div className="flex flex-wrap gap-x-2">
                    <dt className="text-muted-foreground">你的选择：</dt>
                    <dd
                      className={cn(
                        'wrap-anywhere',
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
                    <dd className="wrap-anywhere text-primary">
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
                <p className="mt-3 text-sm text-muted-foreground">
                  主观题不判分，可对照参考内容自查。
                </p>
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
