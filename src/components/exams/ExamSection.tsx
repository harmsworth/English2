import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { ExamSectionWithItems } from '@/services/exams'
import { ChoiceQuestion, TitlePool } from './ChoiceQuestion'
import { PassageText } from './PassageText'
import { TextQuestion } from './TextQuestion'
import { readBoolean, readString, readStringArray, readStructuredChart } from './json-utils'

/** 图表类型的展示名；未知类型回退为原始值。 */
const CHART_TYPE_LABELS: Record<string, string> = {
  bar: '柱状图',
  line: '折线图',
  pie: '饼图',
}

/** 比较文本是否「实质相同」，用于组级字段与小级内容的去重。 */
function normalize(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

/**
 * 判断一个 section 是否为「翻译」大题。
 *
 * 机器契约是 `source_id`（形如 `zy-2026-trans`），而不是中文展示名 `type`：
 * 展示名可能随文案调整而漂移，`source_id` 才是稳定的题型标识。用于给翻译题小题
 * 选择「英文原文（请译成中文）」这一题面标签（见 `textItemLabel`）。
 *
 * 注：Phase 5C 起 `exam_sections.passage_zh` 已完全不再下发到前端，因此不再有
 * 「中文参考」折叠；本判断仅用于题面文案，不再承担答案/参考译文隐藏的职责。
 */
function isTranslationSection(sourceId: string): boolean {
  return sourceId.endsWith('-trans')
}

/** 主观题题面的小标题，按题型给出更有信息量的说明。 */
function textItemLabel(section: ExamSectionWithItems): string {
  if (isTranslationSection(section.source_id)) return '英文原文（请译成中文）'
  if (section.type === '写作') return '题目要求'
  return '题目'
}

function SectionMeta({ section }: { section: ExamSectionWithItems }) {
  const parts: string[] = []

  if (section.items.length > 0) parts.push(`${section.items.length} 小题`)
  if (section.score) parts.push(`${section.score} 分`)
  if (section.minutes) parts.push(`建议 ${section.minutes} 分钟`)

  if (parts.length === 0) return null

  return <p className="text-xs text-muted-foreground">{parts.join(' · ')}</p>
}

/**
 * 一道大题（section）。
 *
 * 渲染规则（按数据库真实 `type` 分派，不假设卷面顺序）：
 * - 阅读理解 / 完形填空：英文原文 + 5 / 20 道选择题（每小题 4 个选项）
 * - 新题型：指导语 + 原文 + 备选标题池 + 5 道小题（2010 只有 2 个可选，
 *   其余年份 7 个，因此序号由数据决定，不写死）
 * - 翻译：指导语 + 英文原文（Phase 5C 起不再展示“中文参考”，passage_zh 已不下发）
 * - 写作：题目要求 + 图表（如有）+ 写作要点 + 参考范文（默认折叠）
 *
 * 组级 `passage` / `prompt` 与唯一主观题的 `content` 完全重复时只渲染一次，
 * 避免「英文原文」出现两遍。
 */
export function ExamSection({
  section,
  index,
}: {
  section: ExamSectionWithItems
  index: number
}) {
  const choiceItems = section.items.filter((item) => item.item_type === 'choice')
  const textItems = section.items.filter((item) => item.item_type !== 'choice')

  const textContents = new Set(textItems.map((item) => normalize(item.content)))

  const passage = section.passage?.trim() ? section.passage : null
  const prompt = section.prompt?.trim() ? section.prompt : null
  const showPassage = Boolean(passage) && !textContents.has(normalize(passage))
  const showPrompt = Boolean(prompt) && !textContents.has(normalize(prompt))

  const intro = section.intro?.trim() ? section.intro : null
  const tips = section.tips?.trim() ? section.tips : null

  const titlePool = readStringArray(section.extra_data, 'titles')
  const chartUrl = readString(section.extra_data, 'chart_url')
  // 图表信息只在 section 级 extra_data 读取。小题级 extra_data 自 Phase 4E 起
  // 不再下发（其中翻译题含参考答案 reference_translation），原先的兜底读取随之移除。
  // `chart` 有两种真实形态：结构化对象（2024 / 2025 写作 B，承载数据）与布尔标记
  // （其余年份，仅表示「本题是图表作文」），分别用 readStructuredChart / readBoolean 读。
  const chart = readStructuredChart(section.extra_data, 'chart')
  const chartFlag = readBoolean(section.extra_data, 'chart') ?? false
  // 条形宽度按各数据项相对最大值换算；设下限 1 避免全 0 时除零。
  const chartMax = chart
    ? Math.max(1, ...chart.items.map((item) => item.value))
    : 1
  const sample = readString(section.extra_data, 'sample')

  return (
    <Card>
      <CardHeader className="border-b">
        <CardDescription>
          第 {index + 1} 大题 · {section.type}
        </CardDescription>
        <CardTitle className="text-lg">{section.title}</CardTitle>
        <SectionMeta section={section} />
      </CardHeader>

      <CardContent className="flex flex-col gap-6">
        {intro ? (
          <p className="text-sm leading-6 text-muted-foreground">{intro}</p>
        ) : null}

        {showPassage && passage ? (
          <PassageText text={passage} label="英文原文" />
        ) : null}

        {showPrompt && prompt ? (
          <PassageText text={prompt} label="题目要求" />
        ) : null}

        {textItems.map((item) => (
          <TextQuestion
            key={item.id}
            item={item}
            label={textItemLabel(section)}
          />
        ))}

        {chart ? (
          <figure className="rounded-lg border border-border bg-muted/40 px-4 py-4">
            <figcaption className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <span className="text-xs font-medium tracking-wide text-muted-foreground">
                {chart.title || '图表'}
              </span>
              <span className="text-xs text-muted-foreground">
                {CHART_TYPE_LABELS[chart.type] ?? chart.type}
                {chart.unit ? ` · 单位：${chart.unit}` : ''}
              </span>
            </figcaption>

            <ul className="mt-3 flex flex-col gap-2.5">
              {chart.items.map((item, itemIndex) => (
                <li
                  key={`${item.label}-${itemIndex}`}
                  className="grid grid-cols-[minmax(0,7rem)_1fr_auto] items-center gap-3"
                >
                  <span
                    className="truncate text-sm text-foreground/90"
                    title={item.label}
                  >
                    {item.label}
                  </span>
                  <span className="h-2 overflow-hidden rounded-full bg-border">
                    <span
                      className="block h-full rounded-full bg-primary"
                      style={{ width: `${(item.value / chartMax) * 100}%` }}
                    />
                  </span>
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {item.value}
                    {chart.unit}
                  </span>
                </li>
              ))}
            </ul>
          </figure>
        ) : chartUrl ? (
          <figure className="flex min-h-48 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40">
            <img
              src={chartUrl}
              alt={`${section.title} 图表`}
              loading="lazy"
              className="block h-auto w-full"
            />
          </figure>
        ) : chartFlag ? (
          <p className="text-xs text-muted-foreground">
            本题为图表作文，图表原图尚未收录。
          </p>
        ) : null}

        {tips ? (
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              写作要点
            </p>
            <p className="mt-2 whitespace-pre-line wrap-anywhere text-sm leading-7 text-muted-foreground">
              {tips}
            </p>
          </div>
        ) : null}

        <TitlePool titles={titlePool} />

        {choiceItems.length > 0 ? (
          <div className="flex flex-col gap-5">
            {choiceItems.map((item) => (
              <ChoiceQuestion
                key={item.id}
                item={item}
                letterOnly={titlePool.length > 0}
              />
            ))}
          </div>
        ) : null}

        {sample ? (
          <details className="rounded-lg border border-border bg-muted/40 px-4 py-3">
            <summary className="cursor-pointer text-xs font-medium text-muted-foreground select-none">
              参考范文（建议自己先写一遍再看）
            </summary>
            <div className="mt-3 whitespace-pre-line wrap-anywhere text-sm leading-7 text-muted-foreground">
              {sample}
            </div>
          </details>
        ) : null}
      </CardContent>
    </Card>
  )
}
