import { useState } from 'react'
import { QuestionStem } from '@/components/exams/QuestionStem'
import { MistakeCard } from '@/components/mistakes/MistakeCard'
import type { MistakeSectionGrouping } from '@/lib/mistake-group'
import type { MistakeStatus } from '@/services/mistakes'

/**
 * 一组「同一大题的错题」—— 题干的渲染单位，不是数据单位。
 *
 * 为什么需要：错题是题目级的，题干是大题级的。一篇阅读错了 5 道题，就是 5 张卡片
 * 共用一段原文；卡片各渲染一遍，用户会看到同一段两千多字的原文重复 5 遍。
 * 所以把题干**上提一层**到组：整组只渲染一次，卡片只讲自己那道小题。
 *
 * 展开态由**组**持有（`useState`）：同一篇阅读的 5 道题展开一次就够，
 * 与练习页「按大题 id 记住展开态」是同一个口径。
 *
 * 本组件不判断「该显示哪些错题」—— 分组、筛选都是页面的职责（见 `lib/mistake-group.ts`）。
 */
export function MistakeSectionGroup({
  group,
  mutatingId,
  failedId,
  failureText,
  onStatusChange,
}: {
  group: MistakeSectionGrouping
  /** 正在改状态的那条错题 id（只锁那一张卡，不锁整页） */
  mutatingId?: string
  /** 状态切换失败的那条错题 id */
  failedId?: string
  failureText?: string
  onStatusChange: (mistakeId: string, next: MistakeStatus) => void
}) {
  const [stemOpen, setStemOpen] = useState(false)

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-heading text-[19px] font-semibold">{group.label}</h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          {group.items.length} 道错题
        </p>
      </div>

      {/* 题干整组只渲染一次。组内只有一道题时才传 itemContent：让「小题题面与大题原文
          完全相同」这种情形依旧只显示一遍（与详情页、练习页同一去重口径）。 */}
      {group.stem ? (
        <QuestionStem
          stem={group.stem}
          open={stemOpen}
          onToggle={() => {
            setStemOpen((prev) => !prev)
          }}
          itemContent={group.items.length === 1 ? (group.items[0]?.content ?? null) : null}
        />
      ) : null}

      <ul className="flex list-none flex-col gap-3">
        {group.items.map((mistake) => (
          <li key={mistake.mistakeId}>
            <MistakeCard
              mistake={mistake}
              isMutating={mutatingId === mistake.mistakeId}
              errorText={failedId === mistake.mistakeId ? failureText : undefined}
              onStatusChange={(next) => {
                onStatusChange(mistake.mistakeId, next)
              }}
            />
          </li>
        ))}
      </ul>
    </section>
  )
}
