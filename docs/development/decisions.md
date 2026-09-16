# 重要决策记录

**用途：** 记录真正影响产品 / 架构的决定
**不记录：** 普通编码细节、样式选择、命名偏好

格式：

```text
## YYYY-MM-DD — 决策标题
### Context
### Decision
### Reason
### Consequence
### Status：Accepted / Superseded
```

---

## 2026-09-16 — 关闭 `passage_zh` 前端读取通道，并 REVOKE 列权限

### Context

`exam_sections.passage_zh` 对**翻译题**而言就是参考答案（参考译文）。
此前前端通过 `PAPER_DETAIL_SELECT` 里的 `zh:exam_sections(id, passage_zh)` + `.neq('zh.type','翻译')` 读取该列，用于非翻译题的「中文参考」。

这个方案依赖**服务端过滤条件**来隔离答案，风险有两个：

1. 过滤条件一旦写错（比如用真实表名而非别名）就会把翻译题的参考译文发出去；
2. 数据库层面 `authenticated` 仍持有该列的 SELECT 权限，可绕过前端直接 REST 读取。

### Decision

1. 前端彻底移除 `passage_zh` 读取：`PAPER_DETAIL_SELECT` 不再投影该列，删除 `zh` 别名与相关合并逻辑；
2. 数据库 `REVOKE SELECT (passage_zh) ON exam_sections FROM authenticated`；
3. 非翻译题的「中文参考」折叠一并下线。

### Reason

- 产品需求 `00-product-requirements.md` §12.2 明确：`passage_zh` 不是前端运行时核心数据，"数据可以保留、前端不依赖"；
- 依赖查询条件做安全边界是脆的，列级权限是硬的；
- 移除后 17 套详情页仍完整可用，功能损失仅限一个折叠块。

### Consequence

- 正面：翻译参考译文不再有泄漏路径；
- 负面：非翻译题失去「中文参考」；写作/阅读的中文辅助阅读能力下降；
- 后续：若将来要重新提供中文参考 / 译文，需走**专门的受控通路**（RPC / 视图），不能简单把列加回白名单。

### Status

Accepted（提交 `37217cd`）

---

## 2026-09-16 — 用列级权限收口答案边界，不建视图

### Context

需要让 `authenticated` 读不到 `section_items.correct_option` / `explanation` / `extra_data`、
`exam_sections.source_data`，同时前端正常的四层嵌套查询必须继续可用。

曾考虑建 View 做字段投影。

### Decision

不建 View，改为：

- 应用层：Service 用显式列白名单 + 公开 DTO + 逐字段重建；
- 数据库层：对上述列做列级 `GRANT`/`REVOKE`，收窄 `authenticated` 的列权限。

### Reason

- View 会牵动 `src/services/exams.ts` 的跨表内嵌查询与嵌入关系命名，改动面大、风险高；
- 列级权限是 PostgreSQL 原生能力，改动最小；
- 符合 `docs/architecture.md` §32：不为每个字段创建 View / RPC。

### Consequence

- 四层嵌套查询结构保持不变，前端查询代码无需重写；
- 权限状态依赖 migration 记录（此前无 migration 历史，已在 `9383666` 补齐基线）；
- 回滚需要显式 GRANT 回来，无自动回滚。

### Status

Accepted（提交 `9383666`、`37217cd`、`6e9a400`）

---

## 2026-09-16（已 Superseded）— 补齐 `supabase/migrations/` 基线

> ⚠️ **Superseded（2026-09-16 当日稍晚）**：用户已决定不再使用 migration，
> 并删除了整个 `supabase/migrations/` 目录。本条保留仅作历史记录。
> 现行方式见 `docs/architecture.md` §35：**直接 `supabase db query --linked` 线上执行，不落 migration。**

### Context

此前所有 DDL 都是直接对线上库执行（`npx supabase db query --linked`），仓库无 migration 历史，
远程也无 migration 记录 → 变更不可追溯、不可回滚、换环境无法复现。

### Decision

从线上 introspection 逐对象生成基线 migration：

```text
20260916000001_baseline_schema.sql
20260916000002_baseline_grants.sql
20260916000003_grant_mistakes_authenticated_dml.sql
20260916000004_harden_answer_boundary_column_grants.sql
20260916000005_sync_exam_paper_function.sql
20260916000006_narrow_exam_papers_column_grants.sql
```

### Reason

- `docs/architecture.md` §35 要求数据库变化必须经 migration 管理；
- 答案边界是安全能力，没有版本化等于没有。

### Consequence

- 变更可追溯；
- 已知限制：Docker daemon 当时未运行，`supabase db pull/diff` 的漂移校验未执行，基线为逐项 introspection 核对结果；
- 后续若引入 migration 工作流，需先与线上状态比对确认无漂移。

### Status

Accepted（提交 `9383666`）

---

## 2026-09-15 — `data/exams/index.json` 不作为运行时 Paper List

### Context

`data/exams/index.json` 看起来像"试卷索引"，实际是 **Section-level 离线索引（153 条大题条目）**，
不是 17 套 Paper 的列表。

曾有过用它或改造它来驱动 `/exams` 的倾向。

### Decision

- `/exams` 只从 `exam_papers` 读取（`getCurrentExamPapers()`，`is_current = true` + `year DESC`）；
- `index.json` 保持为离线处理 / 审计产物，不改造成 Paper Index，不重复维护。

### Reason

- 产品需求 §4.3、§20.1 明确禁止建立重复的运行时数据源；
- 题库已在库内，再造一个 JSON index 就是第二套事实来源。

### Consequence

- 前端只有一条题库数据通路；
- 未来 AI 不得再把 `index.json` 当 Paper List 用（此坑已踩过一次，故记入决策）。

### Status

Accepted

---

## 2026-09-15 — Phase 5 不实现判分

### Context

`practice_answers` 表有 `is_correct` 与 `score` 字段。实现练习 UI 时很容易"顺手"把判分也做了。

### Decision

Phase 5 只做「能答题、能保存、能恢复」：

- 不读取题库 `correct_option`
- 不写 `is_correct` / `score`
- Service 的 `ANSWER_SELECT` 白名单与 `PracticeAnswer` DTO 中都不含判分列

### Reason

- 判分需要答案数据，与已建立的答案边界直接冲突，必须先有明确方案（见 [Phase 6 Goal 6.0](../phases/phase-06-answer-review.md#goal-60--确定答案与判分的数据通路前置决策)）；
- 不提前实现未授权需求（`docs/AGENTS.md` §13）。

### Consequence

- 用户做完题不知道对错 —— 这是已知的、有意保留的缺口；
- 字段存在但为空，Phase 6 无需改表结构即可启用。

### Status

Accepted（提交 `a5485b2`、`4a8b47c`）

---

## 2026-09-16 — 判分通路采用服务端判分 RPC（方案 A）

**状态：Accepted** —— 本条取代下方原「待决策」块，Phase 6 Goal 6.0 据此关闭。

### Context

判分必须读取 `section_items.correct_option`，但 Phase 2 / 5C 已把答案列从前端读取路径移除，
并对 `authenticated` 做了列级 `REVOKE`。两者直接冲突，必须在以下方向中做出选择：

- **A. 服务端判分 RPC**（SECURITY DEFINER）：答案只在服务端参与计算，按提交结果回传
- **B. 放宽列级权限**：允许前端在"已提交"后读取答案列
- **C. Edge Function**（Deno + service_role）：效果同 A，另起一套运行时

### Decision

**采用 A：SECURITY DEFINER 判分 RPC。**

调用时机：**用户提交整个大题时批量判分一次**，不是逐题判分。
即作答过程中零答案请求，只有点「提交」时发一次 RPC。

否决 B 与 C，理由见下。

### Reason

选 A：

1. **唯一不回退已有边界的方案** —— 不需要把任何答案列 GRANT 回来
2. 安全边界是硬的 —— 数据库层面 `authenticated` 依然读不到 `correct_option`，
   前端再怎么改 JS 也拿不到未作答题目的答案
3. 成本与项目规模匹配 —— 一个 SQL 函数，不需要新运行时
4. 符合 `docs/architecture.md` §32 的例外条款：「前端权限无法通过普通数据库权限合理实现」
   —— 判分正是这种情况，因此建 RPC 有充分理由，不算过度设计

否决 B（关键原因）：

```text
HTTP 是无状态的，数据库不知道用户"是否已提交"。
GRANT 一旦放开，任意 authenticated 会话随时可执行：
    select item_id, correct_option, explanation from section_items   -- 816 行全部拖走
"前端只在提交后读"只是君子协定。
更根本的是：RLS 只管行不管列，无法表达"content 可读但 correct_option 需满足条件"，
所以 B 没有任何补救手段，等于作废 Phase 2 / 5C 的全部工作。
```

否决 C：效果等同 A，但要多维护一套 Deno 部署，对个人 / 家庭项目是纯负担。

### Consequence

正面：

- 用户提交后能看到正确答案与解析，学习闭环打通
- 未提交的题目答案依然完全不可达
- Practice 页作答流程（Phase 5）不需要改动

负面 / 代价：

- 数据库新增一个 SECURITY DEFINER 对象，属于提权面，必须严格校验（见下方实施约束）
- 每次提交多一次 RPC 往返
- 若日后数据库被重建，该 RPC 不在 migration 里（用户已豁免 migration 要求），需手工重建

**概念澄清（避免后续走偏）：**
安全目标**不是**"用户永远看不到答案" —— 提交后看到正确答案与解析正是学习闭环的核心。
真正的目标是：**不能在未作答的情况下批量获取全库答案。**

### 实施约束（实现 RPC 时不得遗漏）

1. **必须校验会话归属**：`where pa.session_id = p_session_id and ps.user_id = auth.uid()`。
   漏掉这一行，任何人传任意 `session_id` 即可提权拿走答案 —— 这是 SECURITY DEFINER 最经典的漏洞。
2. **必须 `set search_path = public, pg_temp`**，防 search_path 注入。
3. **`is_correct` 在服务端写回** `practice_answers`，不由前端回写 ——
   否则用户可篡改自己的判分结果，导致 Phase 7 错题本数据失真。
4. **主观题不判分**：只处理 `item_type = 'choice'` 的题；翻译 / 写作返回 `is_correct = null`。
5. **翻译题参考答案**（`section_items.extra_data.reference_translation`，已被 REVOKE）
   必须走**同一个 RPC** 返回，不能另开读取通道。
6. 需要 `GRANT EXECUTE ON FUNCTION ... TO authenticated`。

### 关联豁免

- 用户 2026-09-16 明确：**不写 migration、不做 SQL 备份**。
  本 RPC 将直接通过 `npx supabase db query --linked` 作用于线上库，
  仓库 `supabase/migrations/` **不会**新增文件。

### Status

Accepted（2026-09-16，用户拍板）
