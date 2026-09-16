# 数据说明

**目录：** `docs/data/`
**上位文档：** `docs/architecture.md` §3–§13、§28–§35

---

## 1. 这个目录回答什么问题

> **数据从哪来？运行时读什么？什么不能当数据源？答案边界在哪？**

---

## 2. 两类数据

```text
数据
 ├── Offline Data     data/exams/          原始 / 解析 / 转换 / 校验 / 同步 / 审计
 └── Runtime Data     Supabase PostgreSQL  Web App 唯一读取源
```

**Supabase PostgreSQL 是运行时事实来源。**
前端永远从 Supabase 读，不从 GitHub raw JSON 读。

---

## 3. Runtime Data

### 3.1 核心题库表（前端只读）

```text
exam_papers                    一套历年真题
    ↓ paper_id
exam_sections                  一个大题
    ↓ section_id
section_items                  一道小题
    ↓ item_id
item_options                   一个选项
```

规模基线：

```text
17 papers / 153 sections / 816 items / 3290 options   （2010–2026）
```

每年固定 9 个大题：

```text
阅读理解 ×4  +  完形填空 ×1  +  新题型 ×1  +  翻译 ×1  +  写作 ×2
```

### 3.2 用户学习数据表（前端可写，RLS 限本人）

```text
practice_sessions   练习 / 考试 / 错题会话
practice_answers    每次作答
mistakes            错题（表已建，尚未有前端代码使用）
mistake_reviews     错题复习记录（同上）
```

### 3.3 前端运行时**不读取**的列

```text
exam_sections.passage_zh       翻译题的 passage_zh 即参考译文
exam_sections.source_data      原始题面 JSON，153 个大题里 102 个含 ans / explain
section_items.correct_option   0-based 正确答案下标
section_items.explanation      解析
section_items.extra_data       翻译题含 reference_translation
exam_papers.content_hash / source_file / metadata / version / source_id / is_current
practice_answers.is_correct    判分列，Phase 5 不写不读
practice_answers.score         同上
```

判分只能靠 `correct_option` 与 `option_index` 比对（`item_options` **没有** `is_correct`）。

### 3.4 数据契约要点

- 排序：`sections` 按 `sort_order`、`items` 按 `item_no`、`options` 按 `option_index`（`section_items` **没有** `sort_order`）
- 查询一律显式列白名单，**禁止 `*`**
- Service 返回公开 DTO，逐字段重建，不 `...row`
- 题型机器契约是 `source_id`（如 `zy-2026-trans`），中文 `type` 只是展示名
- ⚠️ 命名例外：2024 / 2025 小作文 `source_id` 是 `zy-YYYY-write-a`，其余年份是 `-write-s`

---

## 4. Offline Data（`data/exams/`）

用途：**原始数据、解析、转换、校验、同步、审计**。
**不是**前端 Runtime API。

### 4.1 `papers-YYYY.json`

- 2010–2026，共 17 个文件
- **顶层是 array（长度 9），元素是「大题 / section」，不是 paper**
- 每个 section 对象的键名是 `id`（如 `zy-2010-read-1`），**没有 `source_id` 键**
- item 级 `source_id` 由 `sync_exam_paper` 生成
- `ans` 是 **0-based** 下标，DB `correct_option` 直接沿用，不做 +1

### 4.2 `index.json` —— ⚠️ 最容易被误用

```text
data/exams/index.json
```

它是 **离线 Section-level 索引**，约 **153 条大题条目**，结构形如：

```json
{ "schemaVersion": 1, "papers": [ { "id": "zy-2010-read-1", "type": "阅读理解", "title": "2010年真题 · Text 1", "year": 2010, "score": 10, "minutes": 8 }, ... ] }
```

**它不是 17 套 Paper 的列表。**

因此：

- ❌ 不作为 `/exams` 的数据源
- ❌ 不强行改造成 Paper Index
- ❌ 不为前端展示重复维护它
- ✅ 只作为离线处理 / 审计产物

> 这个坑已经踩过，见 [`docs/development/decisions.md`](../development/decisions.md) 中「`data/exams/index.json` 不作为运行时 Paper List」。

### 4.3 `manifest.json`

- 源文件信息、SHA256 指纹、数据统计
- 用于同步幂等与审计
- **不是**任何用户页面的数据源

---

## 5. 同步原则

```text
data/exams/papers-YYYY.json  （Source of Truth）
        ↓ 计算 SHA-256
        ↓ sync_exam_paper(p_source_id, p_source_file, p_content_hash, p_year, p_title, p_source_json)
        ↓ Supabase
        ↓ 同一 hash 重复同步幂等（version +1、旧行 is_current = false）
```

- 题库内容变更：**先改 `data/`，再同步**，不直接改数据库
- 同步需要 `service_role` 或 postgres 通道，前端绝不可持有该凭据
- RPC 是 SECURITY INVOKER，authenticated 无写权限

---

## 6. 数据库变更原则

- **不使用 migration**：`supabase/migrations/` 已从仓库移除。
  变更直接用 `npx supabase db query --linked --project-ref <ref> -f <sql>` 执行到线上库
- 验证依赖**实时读取线上对象**：`information_schema` / `pg_get_functiondef` / `pg_policies` /
  `role_table_grants` / `information_schema.column_privileges`
- 由于变更不在仓库留痕，**执行前必须把完整 SQL 摊开给用户确认**，跑完立即读回线上状态核对
- 破坏性操作（DROP / TRUNCATE / 大规模 DELETE）必须先经用户确认
- 若 `.ts` 类型受影响，`src/types/database.ts` 必须在同一轮同步

---

## 7. 答案边界（不可回退）

```text
用户需要的业务数据        → 正常读取
答案 / 解析 / 内部字段    → 只在真正需要的位置、通过受控通路提供
```

当前实现：

- 应用层：列白名单 + 公开 DTO + 逐字段重建
- 数据库层：`authenticated` 对上述列无 SELECT 权限（列级 GRANT/REVOKE）

未来若需要判分或展示解析：

**必须建立独立受控通路**（见 [Phase 6 Goal 6.0](../phases/phase-06-answer-review.md#goal-60--确定答案与判分的数据通路前置决策)），
**不得**简单把答案列加回 `src/services/exams.ts` 的常规白名单。

---

## 8. 快速判断表

| 我想… | 应该 | 不应该 |
| --- | --- | --- |
| 拿试卷列表 | `getCurrentExamPapers()` | 读 `index.json` |
| 拿某套真题全貌 | `getExamPaperById()` | 自己拼 JSON |
| 判断是不是翻译题 | `source_id.endsWith('-trans')` | `type === '翻译'` |
| 判断答案对错 | 待 Phase 6 决策的受控通路 | 前端直读 `correct_option` |
| 改题库内容 | 改 `data/exams/*.json` 后同步 | 直接 UPDATE 数据库 |
| 加字段给前端 | 先问是否越过答案边界 | 直接加进白名单 |
