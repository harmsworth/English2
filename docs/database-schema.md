# supabase 数据库 Schema 文档（依据 Supabase 实际结构整理）

> 本文档依据当前 Supabase 实际数据库导出结果整理，覆盖 9 张业务表、外键、唯一/检查约束、RLS 策略、索引及 3 个函数（含 `sync_exam_paper` 完整定义）。可直接作为 `docs/database-schema.md` 使用，并作为 WorkBuddy 开发约束依据。

---

## 1. 总览

### 1.1 表清单

| 表名 | 说明 | 归属 |
|---|---|---|
| `exam_papers` | 试卷主表（含版本管理） | 公共题库 |
| `exam_sections` | 试卷大题/板块 | 公共题库 |
| `section_items` | 大题下的小题 | 公共题库 |
| `item_options` | 选择题选项 | 公共题库 |
| `practice_sessions` | 练习/考试/错题复习会话 | 用户数据 |
| `practice_answers` | 会话中的作答记录 | 用户数据 |
| `mistakes` | 错题本 | 用户数据 |
| `mistake_reviews` | 错题复习记录 | 用户数据 |
| `rls_auto_enable` / `set_updated_at` / `sync_exam_paper` | 函数 | — |

### 1.2 关系图（文字版）

```
exam_papers (1)
  └─< exam_sections (N)            [paper_id → exam_papers.id, CASCADE]
        └─< section_items (N)      [section_id → exam_sections.id, CASCADE]
              └─< item_options (N) [item_id → section_items.id, CASCADE]

practice_sessions (1)
  ├─< practice_answers (N)         [session_id → practice_sessions.id, CASCADE]
  └── paper_id / section_id        [RESTRICT]

mistakes (1)
  ├─< mistake_reviews (N)          [mistake_id → mistakes.id, CASCADE]
  └── item_id → section_items.id   [RESTRICT]
```

---

## 2. 表结构

### 2.1 `exam_papers` 试卷主表

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | 主键 |
| `source_id` | text | NO | — | 源标识（与 version 组合唯一） |
| `year` | integer | NO | — | 年份，1900–2100 |
| `title` | text | NO | — | 标题 |
| `version` | integer | NO | `1` | 版本号，≥1 |
| `is_current` | boolean | NO | `true` | 是否当前版本 |
| `source_file` | text | YES | — | 源文件路径 |
| `metadata` | jsonb | NO | `'{}'::jsonb` | 元数据 |
| `created_at` | timestamptz | NO | `now()` | 创建时间 |
| `updated_at` | timestamptz | NO | `now()` | 更新时间 |
| `content_hash` | text | YES | — | 内容哈希（用于幂等同步） |

**约束**
- 唯一：`(source_id, version)` — `exam_papers_source_version_unique`
- 唯一：`source_id`（部分索引，仅 `is_current = true` 时生效）— `exam_papers_one_current_version_idx`
- CHECK：`version >= 1`
- CHECK：`year >= 1900 AND year <= 2100`

**索引**
- `exam_papers_pkey (id)`
- `exam_papers_source_version_unique (source_id, version)`
- `exam_papers_one_current_version_idx (source_id) WHERE is_current = true`（唯一）
- `exam_papers_current_idx (is_current)`
- `exam_papers_year_idx (year)`

---

### 2.2 `exam_sections` 试卷板块

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | 主键 |
| `paper_id` | uuid | NO | — | → `exam_papers.id` |
| `source_id` | text | NO | — | 源标识 |
| `type` | text | NO | — | 题型（阅读理解/完形填空/新题型/翻译/写作） |
| `title` | text | NO | — | 标题 |
| `score` | numeric(6,2) | YES | — | 分值，≥0 |
| `minutes` | integer | YES | — | 建议时长，≥0 |
| `intro` | text | YES | — | 简介 |
| `passage` | text | YES | — | 原文 |
| `passage_zh` | text | YES | — | 中文翻译 |
| `prompt` | text | YES | — | 写作提示 |
| `tips` | text | YES | — | 提示 |
| `extra_data` | jsonb | NO | `'{}'::jsonb` | 扩展数据 |
| `source_data` | jsonb | NO | `'{}'::jsonb` | 原始数据 |
| `sort_order` | integer | NO | `0` | 排序，≥0 |
| `created_at` | timestamptz | NO | `now()` | — |
| `updated_at` | timestamptz | NO | `now()` | — |

**约束**
- 唯一：`(paper_id, source_id)` — `exam_sections_source_unique`
- CHECK：`score IS NULL OR score >= 0`
- CHECK：`minutes IS NULL OR minutes >= 0`
- CHECK：`sort_order >= 0`
- 外键：`paper_id → exam_papers.id`，`ON DELETE CASCADE`

**索引**
- `exam_sections_pkey (id)`
- `exam_sections_source_unique (paper_id, source_id)`（唯一）
- `exam_sections_paper_id_idx (paper_id)`
- `exam_sections_sort_order_idx (paper_id, sort_order)`
- `exam_sections_type_idx (type)`

---

### 2.3 `section_items` 小题

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | 主键 |
| `section_id` | uuid | NO | — | → `exam_sections.id` |
| `source_id` | text | NO | — | 源标识 |
| `item_no` | integer | NO | — | 题号，≥1 |
| `item_type` | text | NO | — | `choice` / `text` |
| `content` | text | YES | — | 题干 |
| `explanation` | text | YES | — | 解析 |
| `correct_option` | integer | YES | — | 正确选项索引，≥0 |
| `extra_data` | jsonb | NO | `'{}'::jsonb` | 扩展数据 |
| `created_at` | timestamptz | NO | `now()` | — |
| `updated_at` | timestamptz | NO | `now()` | — |

**约束**
- 唯一：`(section_id, item_no)` — `section_items_number_unique`
- 唯一：`(section_id, source_id)` — `section_items_source_unique`
- CHECK：`item_no >= 1`
- CHECK：`correct_option IS NULL OR correct_option >= 0`
- 外键：`section_id → exam_sections.id`，`ON DELETE CASCADE`

**索引**
- `section_items_pkey (id)`
- `section_items_number_unique (section_id, item_no)`（唯一）
- `section_items_source_unique (section_id, source_id)`（唯一）
- `section_items_section_id_idx (section_id)`
- `section_items_number_idx (section_id, item_no)`

---

### 2.4 `item_options` 选项

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | 主键 |
| `item_id` | uuid | NO | — | → `section_items.id` |
| `option_index` | integer | NO | — | 选项索引，≥0 |
| `content` | text | NO | — | 选项内容 |
| `created_at` | timestamptz | NO | `now()` | — |

**约束**
- 唯一：`(item_id, option_index)` — `item_options_unique`
- CHECK：`option_index >= 0`
- 外键：`item_id → section_items.id`，`ON DELETE CASCADE`

**索引**
- `item_options_pkey (id)`
- `item_options_unique (item_id, option_index)`（唯一）
- `item_options_item_id_idx (item_id)`

---

### 2.5 `practice_sessions` 练习会话

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | 主键 |
| `user_id` | uuid | NO | — | 用户 ID |
| `session_type` | text | NO | — | `practice` / `exam` / `mistake` |
| `status` | text | NO | `'active'` | `active` / `paused` / `completed` |
| `section_id` | uuid | YES | — | → `exam_sections.id` |
| `paper_id` | uuid | YES | — | → `exam_papers.id` |
| `current_item_no` | integer | NO | `1` | 当前题号，≥1 |
| `started_at` | timestamptz | NO | `now()` | — |
| `paused_at` | timestamptz | YES | — | — |
| `completed_at` | timestamptz | YES | — | — |
| `time_limit_seconds` | integer | YES | — | 限时，>0 |
| `elapsed_seconds` | integer | NO | `0` | 已用时长，≥0 |
| `created_at` | timestamptz | NO | `now()` | — |
| `updated_at` | timestamptz | NO | `now()` | — |

**约束**
- CHECK：`session_type IN ('practice','exam','mistake')`
- CHECK：`status IN ('active','paused','completed')`
- CHECK：`current_item_no >= 1`
- CHECK：`elapsed_seconds >= 0`
- CHECK：`time_limit_seconds IS NULL OR time_limit_seconds > 0`
- CHECK：`practice_sessions_target_check` — 当 `session_type = 'practice'` 时 `section_id` 非空；`exam` / `mistake` 时 `paper_id` 或 `section_id` 至少一个非空（原定义被截断，建议以数据库实际为准）
- 外键：`paper_id → exam_papers.id`，`ON DELETE RESTRICT`
- 外键：`section_id → exam_sections.id`，`ON DELETE RESTRICT`

**索引**
- `practice_sessions_pkey (id)`
- `practice_sessions_user_id_idx (user_id)`
- `practice_sessions_user_status_idx (user_id, status)`
- `practice_sessions_created_at_idx (created_at DESC)`
- `practice_sessions_paper_idx (paper_id)`
- `practice_sessions_section_idx (section_id)`

---

### 2.6 `practice_answers` 作答记录

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | 主键 |
| `session_id` | uuid | NO | — | → `practice_sessions.id` |
| `item_id` | uuid | NO | — | → `section_items.id` |
| `selected_option` | integer | YES | — | 所选选项，≥0 |
| `text_answer` | text | YES | — | 文字答案 |
| `is_correct` | boolean | YES | — | 是否正确 |
| `score` | numeric(6,2) | YES | — | 得分，≥0 |
| `time_spent_seconds` | integer | NO | `0` | 用时，≥0 |
| `answered_at` | timestamptz | YES | — | — |
| `created_at` | timestamptz | NO | `now()` | — |
| `updated_at` | timestamptz | NO | `now()` | — |

**约束**
- 唯一：`(session_id, item_id)` — `practice_answers_unique`
- CHECK：`selected_option IS NULL OR selected_option >= 0`
- CHECK：`score IS NULL OR score >= 0`
- CHECK：`time_spent_seconds >= 0`
- 外键：`session_id → practice_sessions.id`，`ON DELETE CASCADE`
- 外键：`item_id → section_items.id`，`ON DELETE RESTRICT`

**索引**
- `practice_answers_pkey (id)`
- `practice_answers_unique (session_id, item_id)`（唯一）
- `practice_answers_session_idx (session_id)`
- `practice_answers_item_idx (item_id)`
- `practice_answers_answered_at_idx (answered_at DESC)`

---

### 2.7 `mistakes` 错题本

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | 主键 |
| `user_id` | uuid | NO | — | 用户 ID |
| `item_id` | uuid | NO | — | → `section_items.id` |
| `status` | text | NO | `'active'` | `active` / `reviewing` / `mastered` |
| `first_wrong_at` | timestamptz | NO | `now()` | — |
| `last_wrong_at` | timestamptz | NO | `now()` | — |
| `review_count` | integer | NO | `0` | ≥0 |
| `consecutive_correct` | integer | NO | `0` | ≥0 |
| `mastered_at` | timestamptz | YES | — | — |
| `removed_at` | timestamptz | YES | — | — |
| `created_at` | timestamptz | NO | `now()` | — |
| `updated_at` | timestamptz | NO | `now()` | — |

**约束**
- 唯一：`(user_id, item_id)` — `mistakes_user_item_unique`
- CHECK：`status IN ('active','reviewing','mastered')`（原定义被截断，实际值以数据库为准）
- CHECK：`review_count >= 0`
- CHECK：`consecutive_correct >= 0`
- 外键：`item_id → section_items.id`，`ON DELETE RESTRICT`

**索引**
- `mistakes_pkey (id)`
- `mistakes_user_item_unique (user_id, item_id)`（唯一）
- `mistakes_user_status_idx (user_id, status)`
- `mistakes_user_updated_idx (user_id, updated_at DESC)`
- `mistakes_item_idx (item_id)`

---

### 2.8 `mistake_reviews` 错题复习记录

| 字段 | 类型 | 可空 | 默认值 | 说明 |
|---|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` | 主键 |
| `mistake_id` | uuid | NO | — | → `mistakes.id` |
| `user_id` | uuid | NO | — | 用户 ID |
| `selected_option` | integer | YES | — | ≥0 |
| `text_answer` | text | YES | — | — |
| `is_correct` | boolean | YES | — | — |
| `score` | numeric(6,2) | YES | — | ≥0 |
| `reviewed_at` | timestamptz | NO | `now()` | — |
| `created_at` | timestamptz | NO | `now()` | — |

**约束**
- CHECK：`selected_option IS NULL OR selected_option >= 0`
- CHECK：`score IS NULL OR score >= 0`
- 外键：`mistake_id → mistakes.id`，`ON DELETE CASCADE`

**索引**
- `mistake_reviews_pkey (id)`
- `mistake_reviews_mistake_idx (mistake_id)`
- `mistake_reviews_user_idx (user_id)`
- `mistake_reviews_reviewed_at_idx (reviewed_at DESC)`

---

## 3. 外键汇总

| 表 | 字段 | 引用 | 更新规则 | 删除规则 |
|---|---|---|---|---|
| `exam_sections` | `paper_id` | `exam_papers.id` | NO ACTION | CASCADE |
| `item_options` | `item_id` | `section_items.id` | NO ACTION | CASCADE |
| `mistake_reviews` | `mistake_id` | `mistakes.id` | NO ACTION | CASCADE |
| `mistakes` | `item_id` | `section_items.id` | NO ACTION | RESTRICT |
| `practice_answers` | `item_id` | `section_items.id` | NO ACTION | RESTRICT |
| `practice_answers` | `session_id` | `practice_sessions.id` | NO ACTION | CASCADE |
| `practice_sessions` | `paper_id` | `exam_papers.id` | NO ACTION | RESTRICT |
| `practice_sessions` | `section_id` | `exam_sections.id` | NO ACTION | RESTRICT |
| `section_items` | `section_id` | `exam_sections.id` | NO ACTION | CASCADE |

---

## 4. RLS 策略

### 4.1 公共题库（题库维护者共同管理）

| 表 | 策略名 | 角色 | 命令 | 条件 |
|---|---|---|---|---|
| `exam_papers` | authenticated users can read exam papers | authenticated | SELECT | `true` |
| `exam_papers` | authenticated users can manage exam papers | authenticated | ALL | `true` / `true` |
| `exam_sections` | authenticated users can read exam sections | authenticated | SELECT | `true` |
| `exam_sections` | authenticated users can manage exam sections | authenticated | ALL | `true` / `true` |
| `section_items` | authenticated users can read section items | authenticated | SELECT | `true` |
| `section_items` | authenticated users can manage section items | authenticated | ALL | `true` / `true` |
| `item_options` | authenticated users can read item options | authenticated | SELECT | `true` |
| `item_options` | authenticated users can manage item options | authenticated | ALL | `true` / `true` |

### 4.2 用户数据（仅本人可读写）

| 表 | 策略名 | 命令 | 条件 |
|---|---|---|---|
| `practice_sessions` | users can read own sessions | SELECT | `auth.uid() = user_id` |
| `practice_sessions` | users can create own sessions | INSERT | `auth.uid() = user_id` |
| `practice_sessions` | users can update own sessions | UPDATE | `auth.uid() = user_id` |
| `practice_sessions` | users can delete own sessions | DELETE | `auth.uid() = user_id` |
| `practice_answers` | users can read own answers | SELECT | 通过 `session_id` 关联 `practice_sessions.user_id = auth.uid()` |
| `practice_answers` | users can create own answers | INSERT | 同上 |
| `practice_answers` | users can update own answers | UPDATE | 同上 |
| `mistakes` | users can read own mistakes | SELECT | `auth.uid() = user_id` |
| `mistakes` | users can create own mistakes | INSERT | `auth.uid() = user_id` |
| `mistakes` | users can update own mistakes | UPDATE | `auth.uid() = user_id` |
| `mistakes` | users can delete own mistakes | DELETE | `auth.uid() = user_id` |
| `mistake_reviews` | users can read own mistake reviews | SELECT | `auth.uid() = user_id` |
| `mistake_reviews` | users can create own mistake reviews | INSERT | `auth.uid() = user_id` |
| `mistake_reviews` | users can update own mistake reviews | UPDATE | `auth.uid() = user_id` |

> 注意：`practice_answers` 没有 DELETE 策略；`mistake_reviews` 没有 DELETE 策略。

---

## 5. 函数

### 5.1 `rls_auto_enable()`

- 返回：`event_trigger`
- 安全：`SECURITY DEFINER`
- 作用：在 `public` schema 中新建表时自动开启 RLS。

### 5.2 `set_updated_at()`

- 返回：`trigger`
- 安全：`invoker`
- 作用：触发器函数，将 `new.updated_at` 设为 `now()`。

### 5.3 `sync_exam_paper(...)`

**签名**
```sql
sync_exam_paper(
  p_source_id text,
  p_source_file text,
  p_content_hash text,
  p_year integer,
  p_title text,
  p_source_json jsonb
) RETURNS jsonb
```

- 安全：`invoker`，`SET search_path TO 'public'`
- 用途：将一份试卷 JSON 同步进库，支持幂等（hash 相同则跳过）、版本递增、旧版本 `is_current=false`。

**关键行为**
1. 参数校验：`p_source_id`、`p_source_file`、`p_content_hash` 非空；`p_source_json` 必须是 JSON 数组。
2. 若当前版本 `content_hash` 与传入一致 → 返回 `status='unchanged'`，不做任何写入。
3. 否则取 `max(version)+1`，将旧版本 `is_current=false`，插入新 `exam_papers`。
4. 遍历 sections，按 `type` 分派：
   - `阅读理解` → 读取 `questions`，生成 `section_items`（`item_type='choice'`）与 `item_options`
   - `完形填空` → 读取 `blanks`，生成 `section_items` 与 `item_options`
   - `新题型` → 读取 `paras`，生成 `section_items`，`titles` 作为选项
   - `翻译` → 生成 1 个 `item_type='text'` 的小题，`extra_data` 存 `intro` / `reference_translation`
   - `写作` → 生成 1 个 `item_type='text'` 的小题，`extra_data` 存 `tips` / `chart`
5. 返回：
```json
{
  "success": true,
  "status": "imported" | "unchanged",
  "source_id": "...",
  "paper_id": "...",
  "version": 1,
  "sections_count": 0,
  "items_count": 0,
  "options_count": 0
}
```

**调用示例**
```sql
select public.sync_exam_paper(
  'cet6-2023-12',
  'data/cet6/2023-12.json',
  'sha256:...',
  2023,
  '2023年12月六级真题',
  '[...]'::jsonb
);
```

---

## 6. 开发约束（交给 WorkBuddy）

1. **公共题库表**（`exam_papers` / `exam_sections` / `section_items` / `item_options`）：
   - 读：所有已登录用户可读。
   - 写：仅通过 `sync_exam_paper` 或后台管理写入；前端不应直接 INSERT/UPDATE/DELETE。
   - 版本管理：同一 `source_id` 只允许一条 `is_current = true`，由部分唯一索引保证。

2. **用户数据表**（`practice_sessions` / `practice_answers` / `mistakes` / `mistake_reviews`）：
   - 所有查询必须带 `user_id = auth.uid()` 或通过 `session_id` 间接约束。
   - `practice_answers` 的唯一键为 `(session_id, item_id)`，重复作答应走 UPDATE。
   - `mistakes` 的唯一键为 `(user_id, item_id)`，同一题只保留一条错题记录。
   - `mistakes.status` 取值：`active` / `reviewing` / `mastered`（具体以数据库 CHECK 为准）。

3. **删除规则**：
   - 删除试卷会级联删除 sections / items / options，但若已有 `practice_sessions` 引用则被 RESTRICT 阻止。
   - 删除会话会级联删除其 answers。
   - 删除错题会级联删除 reviews。
   - 删除 `section_items` 前需先清理 `mistakes` 与 `practice_answers`（RESTRICT）。

4. **时间字段**：
   - 所有表均有 `created_at` / `updated_at`（部分表只有 `created_at`）。
   - `updated_at` 应由 `set_updated_at` 触发器维护（需确认触发器已绑定到对应表）。

5. **函数调用**：
   - `sync_exam_paper` 为 `invoker` 安全，调用者需具备对应表的写权限。
   - 建议仅由服务端/管理端调用，避免前端直接暴露。

6. **RLS 注意事项**：
   - `practice_answers` 的 SELECT/INSERT/UPDATE 都依赖子查询 `practice_sessions`，性能上应确保 `practice_sessions.id` 与 `user_id` 有索引（已有）。
   - `mistake_reviews` 无 DELETE 策略，如需删除请补充策略或走后台。

---

## 7. 待确认项

以下内容在原导出结果中被截断，建议回库确认后再补全本文档：

1. `practice_sessions_target_check` 完整表达式。
2. `practice_sessions_status_check` 完整取值列表。
3. `mistakes_status_check` 完整取值列表。
4. `mistake_reviews` 是否确实无 DELETE 策略。
5. `set_updated_at` 触发器实际绑定到哪些表。

---

*文档生成时间：依据当前 Supabase 导出结果整理。*
