# 历年真题列表（ExamListPage）

**路由：** `/exams`
**文件：** `src/pages/ExamListPage.tsx`
**所属 Phase：** [Phase 2](../phases/phase-02-content-pipeline.md)、[Phase 4](../phases/phase-04-exam-browse.md)

---

## 1. 页面目的

让用户快速选一套历年真题。

这是整个学习流程的主入口，必须一眼看全 17 套、一眼点中。

---

## 2. 用户进入方式

- 首页「查看历年真题」
- 详情页「← 历年真题」
- 直接访问 `/exams`

---

## 3. 用户可以做什么

- 看到 2010–2026 共 17 套真题
- 点击任意一套，进入该套真题详情

---

## 4. 页面信息结构

```text
← 返回首页

历年真题
共 17 套，按年份从新到旧排列。

┌──────────────────────────────────────┐
│ 2026                    开始练习 →    │
│ 英语（二）2026 年真题                 │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│ 2025                    开始练习 →    │
│ 英语（二）2025 年真题                 │
└──────────────────────────────────────┘
...
┌──────────────────────────────────────┐
│ 2010                    开始练习 →    │
│ 英语（二）2010 年真题                 │
└──────────────────────────────────────┘
```

信息层级要求（来自 `00-product-requirements.md` §9.4）：

- **年份是主视觉**（大号数字）
- 完整名称作为辅助说明
- CTA 明确，用户不需要猜卡片能不能点

---

## 5. 页面状态

| 状态 | 表现 |
| --- | --- |
| loading | 6 条等高骨架块（`animate-pulse`） |
| success | 17 张卡片 |
| empty | 「暂无试卷 / 题库还没有可用的试卷数据，稍后再来看看。」 |
| error | 「试卷列表加载失败」+ service 归一化文案 + 「重新加载」按钮 |

---

## 6. 用户操作

| 操作 | 结果 |
| --- | --- |
| 点击卡片任意位置 | 进入 `/exams/:paperId` |
| 点击「← 返回首页」 | 回到 `/` |
| 错误态点「重新加载」 | `refetch()` 重试 |

---

## 7. 数据来源

```text
ExamListPage
  ↓ useExamPapers()（src/hooks/use-exam-papers.ts）
  ↓ getCurrentExamPapers()（src/services/exams.ts）
  ↓ supabase.from('exam_papers')
```

查询条件：`is_current = true`，`order year DESC`，列白名单 `id, year, title`。

> ⚠️ **严禁**使用 `data/exams/index.json` 作为本页数据源。
> 它是离线 Section-level 索引（153 条大题），不是 17 套 Paper 的列表。
> 详见 [`docs/data/README.md`](../data/README.md)。

---

## 8. 数据展示规则

**展示：**

- `year`
- 由 `year` 派生的名称 `英语（二）YYYY 年真题`
- 总数统计

**不展示：**

- `exam_papers.content_hash` / `source_file` / `metadata` / `version` / `source_id` / `is_current`
- 任何 section / item / option 内容
- 任何答案类字段

---

## 9. 路由

```text
/exams              本页
/exams/:paperId     详情（点击卡片）
/                   返回首页
```

---

## 10. 组件

```text
src/components/ui/card.tsx      Card / CardContent
src/hooks/use-exam-papers.ts
src/services/exams.ts           getCurrentExamPapers / toExamErrorMessage
```

页内局部组件（未导出）：`ListSkeleton`、`StateCard`、`PaperRow`。

---

## 11. 响应式要求

- **desktop**：卡片为横向布局 —— 左：年份 + 名称，右：「开始练习 →」
- **mobile**：卡片改为纵向堆叠（`flex-col`），「开始练习」在下方；年份仍是大号主视觉
- 两档下 CTA 都可见、可点

---

## 12. 验收标准

- 显示 17 套，2026 在最上、2010 在最下
- 每张卡片有年份、名称、CTA
- 点击卡片进入 `/exams/<id>`，URL 正确
- 断网刷新 → 错误卡片 + 「重新加载」可用
- 375px 下卡片纵向堆叠无溢出
- Network 中请求只取 `id, year, title`，无答案字段
- console 无 error

---

## 13. 当前状态

`stable`

> 注意：本页当前在 Git 工作区有**未提交的修改**（`M src/pages/ExamListPage.tsx`）。
> 修改前先 `git diff` 确认用户改动内容，不要覆盖。
