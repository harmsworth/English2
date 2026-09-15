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
import { readBoolean, readString, readStringArray } from './json-utils'

/** 比较文本是否「实质相同」，用于组级字段与小级内容的去重。 */
function normalize(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

/**
 * 这些题型的 `passage_zh` 与参考答案同源（翻译题的 passage_zh
 * 就等于小题的 `reference_translation`），整段隐藏，不能折叠展示。
 */
const ZH_IS_ANSWER_TYPES = new Set(['翻译'])

/** 主观题题面的小标题，按题型给出更有信息量的说明。 */
function textItemLabel(sectionType: string): string {
  if (sectionType === '翻译') return '英文原文（请译成中文）'
  if (sectionType === '写作') return '题目要求'
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
 * - 翻译：指导语 + 英文原文（中文参考译文即参考答案，整段隐藏）
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

  // 翻译题的 passage_zh 就是参考答案，必须整段隐藏
  const zhReference = ZH_IS_ANSWER_TYPES.has(section.type)
    ? null
    : section.passage_zh

  const intro = section.intro?.trim() ? section.intro : null
  const tips = section.tips?.trim() ? section.tips : null

  const titlePool = readStringArray(section.extra_data, 'titles')
  const chartUrl = readString(section.extra_data, 'chart_url')
  // 图表标记只在 section 级 extra_data 读取。
  // 小题级 extra_data 自 Phase 4E 起不再下发（其中翻译题含参考答案
  // reference_translation），原先的兜底读取随之移除；正文数据里 17 个写作
  // 大题的 section.extra_data.chart 全部存在，行为不变。
  const chartFlag = readBoolean(section.extra_data, 'chart') ?? false
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
          <PassageText
            text={passage}
            label="英文原文"
            collapsibleZh={zhReference}
          />
        ) : null}

        {showPrompt && prompt ? (
          <PassageText text={prompt} label="题目要求" />
        ) : null}

        {textItems.map((item) => (
          <TextQuestion
            key={item.id}
            item={item}
            label={textItemLabel(section.type)}
          />
        ))}

        {chartUrl ? (
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
