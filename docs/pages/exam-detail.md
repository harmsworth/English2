# 真题详情（ExamDetailPage）

**路由：** `/exams/:paperId`
**文件：** `src/pages/ExamDetailPage.tsx`
**所属 Phase：** [Phase 2](../phases/phase-02-content-pipeline.md)、[Phase 4](../phases/phase-04-exam-browse.md)

---

## 1. 页面目的

展示某一套完整真题的结构：9 个大题按顺序铺开，让用户看清这套卷子有什么，并选择进入哪个大题练习。

---

## 2. 用户进入方式

- 从 `/exams` 点击试卷卡片
- 练习页「← 返回试卷详情」
- 直接访问 `/exams/:paperId`

---

## 3. 用户可以做什么

- 看到试卷标题、大题数、小题数
- 按顺序浏览 9 个大题的完整题面
- 点击任一题的「开始练习」进入该题练习

---

## 4. 页面信息结构

```text
← 历年真题

2026年真题
共 9 大题 · 48 小题
本页只展示题目；答案与解析不在本页显示。

┌─ 第 1 大题 · 阅读理解 ──────────────┐
│ Text 1                              │
│ 5 小题 · 10 分 · 建议 8 分钟         │
│                                     │
│ 指导语…                             │
│ 英文原文…                            │
│ 1. … A B C D                        │
│ …                                   │
└─────────────────────────────────────┘
                          开始练习
（重复至第 9 大题）
```

9 个大题的固定构成（每年一致）：

```text
阅读理解 ×4  →  完形填空 ×1  →  新题型 ×1  →  翻译 ×1  →  写作 ×2
```

---

## 5. 页面状态

| 状态 | 表现 |
| --- | --- |
| loading | 标题骨架 + 3 个大题骨架块 |
| success | 完整 9 个大题 |
| empty | 「这套试卷还没有录入大题。」 |
| error | 居中「试卷加载失败」+ 归一化文案 + 「重新加载」+ 「返回历年真题」 |
| 404（非法 id） | `paperId` 非标准 UUID 时不发查询，直接显示「试卷不存在」 |
| 404（查无数据） | `getExamPaperById` 返回 `null` → 「试卷不存在」 |

---

## 6. 用户操作

| 操作 | 结果 |
| --- | --- |
| 点击「开始练习」 | 进入 `/exams/:paperId/practice/:sectionId` |
| 点击「← 历年真题」 | 回到 `/exams` |
| 错误态「重新加载」 | `refetch()` |
| 404 态「返回历年真题」 | 回到 `/exams` |

---

## 7. 数据来源

```text
ExamDetailPage
  ↓ useExamPaper(paperId)（src/hooks/use-exam-paper.ts）
  ↓ getExamPaperById()（src/services/exams.ts）
  ↓ supabase 四层嵌套查询（别名 all）
```

- 排序契约：`sections.sort_order` → `items.item_no` → `options.option_index`，全部升序
- `paperId` 必须先过 UUID 正则，避免向数据库发无效查询

---

## 8. 数据展示规则

**展示：**

| 题型 | 展示内容 |
| --- | --- |
| 阅读理解 / 完形填空 | 指导语、英文原文、小题与选项 |
| 新题型 | 指导语、原文、备选标题池、小题 |
| 翻译 | 英文原文（标签「英文原文（请译成中文）」） |
| 写作 | 题目要求、结构化图表或 `chart_url` 图片、写作要点、参考范文（`<details>` 默认折叠） |

**不展示（硬性边界）：**

```text
exam_sections.passage_zh     已完全不下发（翻译题的 passage_zh 即参考译文）
exam_sections.source_data    原始题面 JSON，内含 ans / explain
section_items.correct_option
section_items.explanation
section_items.extra_data     翻译题含 reference_translation
exam_papers.content_hash / source_file / metadata / version / source_id
```

页面顶部明确告知用户「本页只展示题目；答案与解析不在本页显示。」，不要删除这句文案。

**去重规则**：大题级 `passage` / `prompt` 与唯一主观小题的 `content` 完全相同时只渲染一次。

---

## 9. 路由

```text
/exams/:paperId                        本页
/exams/:paperId/practice/:sectionId    练习（开始练习）
/exams                                 返回列表
```

---

## 10. 组件

```text
src/components/exams/ExamSection.tsx      按 type 分派渲染大题
src/components/exams/PassageText.tsx      长文段落
src/components/exams/ChoiceQuestion.tsx   选择题 + TitlePool
src/components/exams/TextQuestion.tsx     主观题题面
src/components/exams/json-utils.ts        extra_data 安全读取（readString / readBoolean / readStringArray / readStructuredChart）
src/components/ui/card.tsx
src/hooks/use-exam-paper.ts
```

页内局部组件：`BackLink`、`CenteredState`。

---

## 11. 响应式要求

- **desktop**：单列 `max-w-3xl`，段落宽度舒适
- **mobile**：同样单列；长英文单词用 `wrap-anywhere` 防止横向溢出；图表 `figure` 内图片宽度自适应
- 两档下「开始练习」都可见可点

---

## 12. 验收标准

- 显示 9 个大题，顺序与 `sort_order` 一致
- 标题显示 `YYYY年真题`，并显示「共 N 大题 · M 小题」
- 每个大题有「开始练习」，点击 URL 为 `/exams/<paperId>/practice/<sectionId>`
- 访问 `/exams/not-a-uuid` → 404 文案，Network 无查询请求
- 访问合法但不存在的 UUID → 404 文案
- 断网刷新 → 错误态 + 重试可用
- **Network 中 detail 响应不含 `correct_option` / `explanation` / `source_data` / `passage_zh`**
- **翻译题参考译文不出现在 DOM 中**
- 375px 与 1280px 下无横向溢出
- console 无 error

---

## 13. 当前状态

`stable`
