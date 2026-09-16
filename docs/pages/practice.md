# 练习页（PracticePage）

**路由：** `/exams/:paperId/practice/:sectionId`
**文件：** `src/pages/PracticePage.tsx`
**所属 Phase：** [Phase 5](../phases/phase-05-practice.md)（作答 / 保存 / 恢复）、[Phase 6](../phases/phase-06-answer-review.md)（提交判分与结果）

---

## 1. 页面目的

让用户在一个大题里逐题作答，作答被可靠保存，中途退出也能接着做；全部做完后**提交一次**，
由服务端判分并给出对错、正确答案与解析。

页面有两个视图，同一个路由：

```text
答题视图  ← 默认
   ↓ 点「提交并查看结果」
结果视图  ← 本次提交的结果（只读）
```

---

## 2. 用户进入方式

- 真题详情页点某个大题的「开始练习」
- 直接访问 `/exams/:paperId/practice/:sectionId`
- 上次未完成（`active` / `paused`）的会话重新进入（自动恢复）

---

## 3. 用户可以做什么

**答题视图：**

- 逐题作答（选择题点选）
- 上一题 / 下一题
- 中途暂停退出，之后恢复
- 看到当前进度（第 N / M 题）与已作答数
- **提交本大题**并查看结果

**结果视图：**

- 看到总览（已作答 / 答对 / 答错 / 未作答）
- 逐题看到「你的选择」与「正确答案」
- 看到解析；翻译题额外看到参考译文
- 返回试卷详情 / 返回历年真题

---

## 4. 页面信息结构

### 4.1 答题视图

```text
← 返回试卷详情
Practice · 阅读理解
第 1 大题 · Text 1

第 1 / 5 题  （本大题第 1 小题）        保存中…

> `item_no` 是**大题内**从 1 开始的连续编号（阅读 1–5、完形 1–20、新题型 1–5、翻译 / 写作恒为 1，
> 17 个年份均已核对）。因此对当前题库而言，括号里的「第 N 小题」与左侧「第 N / M 题」恒等，
> 是冗余展示；保留它是为了在题库编号规则变化时不丢信息。
┌──────────────────────────────────────┐
│ 题干…                                 │
│ ○ A. …                                │
│ ● B. …   ← 已选高亮                   │
│ ○ C. …                                │
│ ○ D. …                                │
└──────────────────────────────────────┘
[上一题]                      [下一题]

────────────────────────────────────────
[提交并查看结果]  [暂停并退出]
已作答 3 题。提交后可查看对错、正确答案与解析；
未作答的题目不参与判分，也不会显示答案。
```

未作答任何一题时，提示为「先选择至少一个答案，才能提交。」且提交按钮禁用。

主观题（翻译 / 写作）小题：

```text
┌──────────────────────────────────────┐
│ 英文原文…                             │
│ 本题为主观题，当前练习模式暂不支持在线提交答案。│
└──────────────────────────────────────┘
```

### 4.2 结果视图

```text
← 返回试卷详情
2026年真题 · Text 1 · 结果
第 1 大题 · 阅读理解

┌──────────────────────────────────────┐
│ 已作答 3 / 5 题                        │
│ 答对 1 题 · 答错 2 题 · 未作答 2 题      │
│ 未作答的题目不参与判分，也不会显示答案。  │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ 第 1 题                         答错   │
│ 题干…                                 │
│ 你的选择：  A. …                       │
│ 正确答案：  D. …                       │
│ ┌─ 解析 ────────────────────────────┐ │
│ │ 正确答案 D。定位第 2 段 …           │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
… （只列出本次实际作答过的题，题号为 `item_no`）

[返回试卷详情]   返回历年真题
```

---

## 5. 页面状态

| 状态 | 表现 |
| --- | --- |
| loading（题面） | 全屏「正在加载题目…」 |
| loading（会话） | 全屏「正在准备练习…」 |
| success | 题目 + 选项 + 导航 |
| error（题面） | 「练习加载失败」+ 归一化文案 + 「重新加载」 |
| error（会话） | 同上，取 `PracticeError` 文案 |
| error（判分） | 提交按钮下方红字，取 `PracticeError` / `toExamErrorMessage` 文案 |
| empty（无此大题） | 「找不到这个大题，回到试卷详情重新选择吧。」+ 返回链接 |
| empty（无题） | 「本大题暂无可作答的题目。」 |
| disabled | 第一题时「上一题」禁用；已作答 0 题或提交中时「提交并查看结果」禁用 |
| last-item | 最后一题时右侧显示「本大题已到最后一题」，不再有「下一题」 |
| saving | 右上角显示「保存中…」 |
| selected | 已选选项高亮（`border-primary bg-primary/5 ring-1`） |
| submitting | 全屏「正在判分…」 |
| graded | 结果视图（见 4.2） |

---

## 6. 用户操作

| 操作 | 结果 |
| --- | --- |
| 点选选项 | 本地高亮 + `upsert` 保存；`UNIQUE(session_id, item_id)` 保证重复选只更新一条 |
| 点击「下一题」 | 索引 +1，并把 `current_item_no` 写入会话 |
| 点击「上一题」 | 索引 -1，同样写进度；第一题时禁用 |
| 点击「提交并查看结果」 | 调 `grade_practice_section` RPC → 结果视图；会话变 `completed` |
| 点击「暂停并退出」 | 会话置 `paused`，跳回 `/exams/:paperId` |
| 点击「← 返回试卷详情」 | 回到详情页（不置 paused） |
| 结果视图「返回试卷详情」/「返回历年真题」 | 跳 `/exams/:paperId` / `/exams` |
| 刷新 / 再次进入 | 从 `current_item_no` 恢复位置，已保存选项回填高亮 |

---

## 7. 数据来源

```text
PracticePage
  ↓ useExamPaper(paperId)              题面（复用详情页同一 query）
  ↓ getExamPaperById()  → exam_papers / exam_sections / section_items / item_options

  ↓ useResumablePracticeSession()      找可恢复会话（只认 active / paused）
  ↓ useCreatePracticeSession()         没有则创建
  ↓ useUpdatePracticeSessionProgress() 进度 / 暂停
  ↓ useUpsertPracticeAnswer()          保存选择
  ↓ usePracticeAnswers()               回填已保存选择
  ↓ useGradePracticeSection()          提交判分（Phase 6）
  ↓ src/services/practice.ts → Supabase
```

会话创建守卫：`resumable.isPending` / `resumable.data` / `createSession.isPending || isSuccess`
均通过才 `mutate`，避免重复创建；**结果视图下不再创建**（见 §13 已知限制）。

### 判分通路（Phase 6）

```text
gradePracticeSection(sessionId)
  → supabase.rpc('grade_practice_section', { p_session_id })
  → 服务端 SECURITY DEFINER 函数：
      1. 校验 practice_sessions.user_id = auth.uid()，否则 raise
      2. 批量写入 practice_answers.is_correct（选择题）
      3. 会话置 completed / 补 completed_at
      4. 只返回**本次会话实际作答过**的题：item/正确答案/解析/参考译文
  → PracticeGradeResult[]（camelCase DTO）
```

判分 RPC 是答案的唯一出口。`authenticated` 角色对 `correct_option` / `explanation` /
`section_items.extra_data` **没有 SELECT 权限**（实测 `42501`），因此不存在
"未作答就批量拿全库答案"的通路 —— 详见 [`decisions.md`](../development/decisions.md)。

---

## 8. 数据展示规则

### 答题视图

**展示：** 大题类型 / 标题 / 序号、当前题号与总题数、`item_no`、题干与选项（`option_index` 升序，
标签优先用题面自带 `A.` 前缀）、保存中状态、已作答数。

**不展示（作答阶段的硬性边界）：**

```text
section_items.correct_option
section_items.explanation
section_items.extra_data     （翻译题含 reference_translation）
exam_sections.passage_zh
exam_sections.source_data
practice_answers.is_correct
practice_answers.score
```

`practice_answers` 查询用白名单，判分列不在其中；Service 的 DTO `PracticeAnswer` 也不含
`is_correct` / `score`。**答题视图 DOM 与 Network 中不得出现上述任何字段。**

### 结果视图

**这是唯一允许展示正确答案与解析的地方**，并且只在提交之后。规则：

- 只渲染 RPC 返回的行 —— **未作答的题不会出现**，也不会顺带显示答案
- 「你的选择」为错时用 `text-destructive`；正确答案恒用 `text-primary`
- 主观题（`is_correct === null`）标「主观题」，说明「不判分，可对照参考内容自查」
- 解析 / 参考译文有值才渲染对应区块

> 边界不是"用户永远看不到答案"——提交后看到正确答案正是学习闭环的核心；
> 边界是"**不能在未作答的情况下批量获取全库答案**"。

---

## 9. 路由

```text
/exams/:paperId/practice/:sectionId    本页（答题 / 结果共用一个路由）
/exams/:paperId                        返回 / 暂停退出落点
/exams                                 历年真题
```

---

## 10. 组件

```text
src/components/practice/PracticeQuestion.tsx   题目渲染（choice / text 分派）
src/components/practice/PracticeResult.tsx     判分结果渲染（纯展示，不发请求）
src/components/ui/card.tsx
src/components/ui/button.tsx
src/hooks/use-practice-session.ts
src/hooks/use-practice-mutations.ts
src/services/practice.ts
src/services/exams.ts
```

页内局部组件（未导出）：`FullScreen`、`ErrorScreen`。

---

## 11. 响应式要求

- **desktop**：`max-w-3xl` 居中，导航按钮左右分列
- **mobile**：同构单列；选项点击区域纵向排列、间距足够；底部按钮不被遮挡
- **结果视图**：题干 / 选项 / 解析长文本必须可换行（`whitespace-pre-line wrap-anywhere`），
  375px 下不出现横向滚动
- 两档下选项、导航按钮、提交按钮均可点

---

## 12. 验收标准

**答题视图（Phase 5）**

- 从详情页进入练习，URL 为 `/exams/<paperId>/practice/<sectionId>`
- 点选选项后 Network 有 upsert 请求；刷新后该选项仍高亮
- 「下一题」推进；刷新回到上次题号
- 第一题「上一题」禁用；最后一题显示「本大题已到最后一题」
- 「暂停并退出」回到详情页，再次进入能恢复
- 翻译 / 写作题显示占位说明，**页面无任何参考答案**
- **作答阶段 Network 响应与 DOM 中不含 `is_correct` / `score` / `correct_option` / `explanation`**

**提交与结果（Phase 6）**

- 未作答任何一题时提交按钮禁用；作答 ≥1 题后可点
- 提交后进入结果视图，总览数字与提交前「已作答 N 题」一致
- 每题给出「你的选择」与「正确答案」；答错标红、答对标主题色
- 解析（及翻译参考译文）按存在与否渲染
- **未作答的题不出现在结果里**，且总览明确提示"未作答的题目不参与判分"
- 结果视图不泄露未作答题的答案

**通用**

- 375px 与 1280px 下可用
- console 无 error、无未捕获异常

---

## 13. 当前状态

`stable`（Phase 5 + Goal 6.1 已通过构建与浏览器验证）

- 作答、保存、恢复已稳定（Phase 5）
- 提交判分、结果展示已落成（Phase 6 Goal 6.1）

### 已知限制

| 限制 | 说明 | 归属 |
| --- | --- | --- |
| 结果不持久可回看 | 结果只存在页面内存里。提交后会话变 `completed`，而可恢复会话查询只认 `active` / `paused`，因此**离开本页再回来是一条全新会话**，看不到上次成绩 | Phase 7（学习记录 / 错题） |
| 主观题不支持在线作答 | 翻译 / 写作只展示题面和占位说明，不采集文本 | Phase 6 之后 |
| 无逐题计时 | `practice_answers.time_spent_seconds` 有列但未写入 | 后续 Phase |
| 判分不写 `mistakes` | 错题表已建、已授权，但判分只写 `practice_answers.is_correct` | Phase 7 |
