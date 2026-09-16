# Phase 4：真题浏览

**状态：** `done`
**上位文档：** [Phases README](./README.md)、`docs/architecture.md`

---

## 1. Phase 目标

让用户能从首页自然走到"看清某一年整套真题的每一道大题"。

这是产品第一次真正面对用户：能否看懂、能否找到、能否点进去。

---

## 2. 用户价值

```text
打开首页 → 进入历年真题 → 选一年 → 看到 9 个大题 → 点进某一个大题开始练习
```

---

## 3. 包含范围

- 首页（产品介绍与主入口）
- 历年真题列表（年份倒序，17 套）
- 真题详情（9 个大题完整铺开）
- 各题型的题面渲染：阅读理解 / 完形填空 / 新题型 / 翻译 / 写作
- 结构化图表渲染（写作 B）
- loading / error / empty / 404 状态

---

## 4. 不包含范围

- 做题交互（Phase 5）
- 答案、解析、判分（Phase 6）
- 中文参考 `passage_zh`（已不下发，见 Phase 2）
- 题量统计、完成度、正确率

---

## 5. 功能目标

| Goal | 内容 | 状态 |
| --- | --- | --- |
| 4.1 | 首页有明确的「查看历年真题」入口 | 完成 |
| 4.2 | `/exams` 从 `exam_papers` 读 17 套，年份倒序，年份为主视觉 | 完成 |
| 4.3 | 点击试卷进入 `/exams/:paperId` | 完成 |
| 4.4 | 详情页按 `sort_order` 展示 9 个大题，显示小题数与分值 | 完成 |
| 4.5 | 每个大题有明确「开始练习」CTA | 完成 |
| 4.6 | 阅读 / 完形渲染英文原文；新题型渲染备选标题池；翻译渲染英文原文；写作渲染要求 + 图表 + 要点 + 参考范文（默认折叠） | 完成 |
| 4.7 | 三种状态齐备：loading 骨架、error 可重试、empty 有文案 | 完成 |
| 4.8 | 非法 paperId（非 UUID）显示 404，不发无效查询 | 完成 |
| 4.9 | 移动端与桌面端均可用 | 完成 |

---

## 6. 涉及页面

- [首页](../pages/home.md)
- [真题列表](../pages/exams.md)
- [真题详情](../pages/exam-detail.md)

---

## 7. 涉及数据

```text
exam_papers    id, year, title            （is_current = true，year DESC）
exam_sections  id, source_id, type, title, score, minutes, intro, passage, prompt, tips, extra_data, sort_order
section_items  id, item_no, item_type, content
item_options   id, option_index, content
```

数据链路：

```text
ExamListPage   → useExamPapers() → getCurrentExamPapers() → exam_papers
ExamDetailPage → useExamPaper()  → getExamPaperById()     → 四层嵌套查询
```

---

## 8. 涉及代码区域

```text
src/pages/HomePage.tsx
src/pages/ExamListPage.tsx
src/pages/ExamDetailPage.tsx
src/components/exams/ExamSection.tsx      按 type 分派渲染
src/components/exams/PassageText.tsx
src/components/exams/ChoiceQuestion.tsx
src/components/exams/TextQuestion.tsx
src/components/exams/json-utils.ts        extra_data 安全读取
src/hooks/use-exam-papers.ts
src/hooks/use-exam-paper.ts
```

---

## 9. 技术约束

- Paper List 只能来自 `exam_papers`，不得重建运行时 JSON（见 `docs/AGENTS.md` §14）
- 详情查询必须保持列白名单，不得为了渲染方便加回 `passage_zh` / `source_data` / `correct_option`
- 题型判断优先用 `source_id` 契约（`zy-YYYY-trans` 等），不依赖中文展示名（翻译题已按此实现）
- 页面只展示中文错误文案，底层错误结构只停留在 service 层

---

## 10. 验收标准

- `/exams` 显示 17 套，2026 在最上，2010 在最下
- 点击进入详情，标题显示 `YYYY年真题`，9 个大题顺序正确
- 每个大题都有「开始练习」
- 断网刷新列表 → 显示错误卡片 + 「重新加载」可用
- 访问 `/exams/not-a-uuid` → 显示 404，不发无效请求
- Network 中 detail 响应不含答案类字段
- 375px 与 1280px 宽度下布局均不破
- `pnpm build` / `pnpm lint` 通过，浏览器 console 无 error

---

## 11. 完成定义

见 [Phases README §7](./README.md#7-完成定义)。

---

## 12. 后续 Phase

[Phase 5：在线练习](./phase-05-practice.md)
