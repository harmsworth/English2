---
description: English2 题库数据来源与同步规则（GitHub → Supabase → React）
alwaysApply: true
---

# Data Source Rules

## 事实来源层级

```text
GitHub data/exams/*.json   ← Source（题库内容源头）
        ↓  sync
Supabase PostgreSQL        ← Runtime（运行时唯一读取源）
        ↓  query
React Client               ← Client（只读，不写入题库）
```

- 前端**永远**从 Supabase 读题库，不从 GitHub raw JSON 直接读
- 前端不写入 `exam_papers` / `exam_sections` / `section_items` / `item_options`
- 题库内容变更必须先在 `data/` 修改，再同步，不是直接改数据库

## 同步机制

1. 题库 JSON 文件位于 `data/exams/`（如 `papers-2010.json`）
2. 计算文件 SHA-256 作为版本指纹
3. 调用 `sync_exam_paper` RPC 写入 Supabase
4. 同一指纹重复同步应为幂等，不产生重复数据

常量集中在 `src/lib/constants.ts`：

```ts
GITHUB_RAW_BASE
EXAM_FILES = ['papers-2010.json', ...]
examKeys = { all, lists(), detail(paperId) }
```

## 禁止

- 前端直接 fetch GitHub raw JSON 当数据源
- 手写 mock 题库数据塞进代码
- 在客户端生成/修改题库内容
- 猜测 `sync_exam_paper` 的参数签名 —— 必须从真实数据库 schema 或生成的类型确认

## 用户数据

以下表属于用户行为数据，与题库区分：

```text
practice_sessions
practice_answers
mistakes
mistake_reviews
```

这些数据由前端写入，受 RLS 约束，归属当前登录用户。
