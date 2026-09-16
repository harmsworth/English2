# English2 当前进度

**性质：** 状态文件，不是聊天记录
**最后更新：** 2026-09-16（Phase 6 Goal 6.1–6.2 落地并通过验证）

---

## Current Phase

**[Phase 6 — 答案、判分与解析](../phases/phase-06-answer-review.md)**（`in-progress`）

用户已于 2026-09-16 授权进入 Phase 6，并选定判分通路为**方案 A（服务端判分 RPC）**。
Goal 6.0 / 6.1 / 6.2 / 6.4 已完成；Goal 6.3 因与 Phase 6 不包含范围冲突而挂起（见下）。

---

## Current Goal

**Goal 6.1 — 客观题判分** ✅ **已完成**
**Goal 6.2 — 结果展示** ✅ **已完成**

### Completed Goals

| Goal | 内容 | 状态 |
| --- | --- | --- |
| 6.0 | 确定答案与判分的数据通路 | ✅ 完成（选定方案 A） |
| 6.1 | 客观题判分 | ✅ 完成 |
| 6.2 | 结果展示 | ✅ 完成 |
| 6.4 | 写作题处理（不判分） | ✅ 完成（`is_correct` 为 `null` → 标「主观题」） |
| 6.3 | 翻译题参考答案展示 | ⚠️ **挂起**（见下） |

**6.1 / 6.2 落地内容：**

1. 线上库新增 `public.grade_practice_section(p_session_id uuid)` —— SECURITY DEFINER、
   `set search_path = public, pg_temp`、校验 `ps.user_id = auth.uid()`、批量判分、
   会话置 `completed`、只返回**本次实际作答过**的题。
   **不在仓库留痕**（用户已豁免 migration），执行记录见下「Last Verification」。
2. `src/services/practice.ts` 新增 `PracticeGradeResult` + `gradePracticeSection(sessionId)`
3. `src/hooks/use-practice-mutations.ts` 新增 `useGradePracticeSection()`
4. `src/components/practice/PracticeResult.tsx`（新）—— 结果渲染，纯展示、不发请求
5. `src/pages/PracticePage.tsx` —— 提交动作 + 结果视图 + 「正在判分…」态

**6.3 为什么挂起：**

Goal 6.3 要求「翻译题的参考答案在提交后展示」，但 6.3 的前提是翻译题**能被提交**；
而 Phase 6 §4「不包含范围」明确排除「主观题在线输入提交」，翻译题因此永远产生不了
`practice_answers` 行 → RPC 永远不返回它 → 参考译文区块不可达。

RPC 侧已经能返回 `extra_data.reference_translation`，`PracticeResult` 也能渲染它，
**只是没有触达路径**。需要用户在两者间选一个，本 Goal 才能收口：

- (a) 删除 / 重写 Goal 6.3，把翻译参考译文归到「主观题在线作答」的后续 Phase；
- (b) 给主观题加独立入口（如「查看参考译文」按钮，不走提交判分）—— 会扩张 Phase 6 范围。

---

## Next Goal

**待用户决策：Goal 6.3 的处置（选项 a / b，见上）。**

决策后可收口 Phase 6，进入 [Phase 7 — 学习记录、错题与复习](../phases/phase-07-learning-loop.md)。

---

## Completed

### Phases

| Phase | 状态 | 说明 |
| --- | --- | --- |
| [1 基础设施与数据访问基础](../phases/phase-01-foundation.md) | `done` | Vite / React 19 / TS6 strict / Tailwind 4 / shadcn-ui / Query / Router / oxlint |
| [2 真题内容体系与数据边界](../phases/phase-02-content-pipeline.md) | `done` | 17 套入库、`sync_exam_paper`、答案边界列级收口、公开 DTO |
| [3 用户身份与访问入口](../phases/phase-03-auth.md) | `done` | Supabase Auth、ProtectedRoute、LoginPage |
| [4 真题浏览](../phases/phase-04-exam-browse.md) | `done` | 首页 / 列表 / 详情 + 各题型渲染 |
| [5 在线练习](../phases/phase-05-practice.md) | `done` | 会话 / 作答 / 保存 / 恢复；不判分 |
| [6 答案、判分与解析](../phases/phase-06-answer-review.md) | `in-progress` | 6.0 / 6.1 / 6.2 / 6.4 完成，6.3 待决策 |

### 关键里程碑（提交）

```text
6e9a400  security: narrow exam_papers read columns        ← HEAD
37217cd  fix: close passage_zh boundary (drop frontend read + revoke)
9383666  chore: bootstrap database migrations and permissions
4a8b47c  feat: add practice answering ui
a5485b2  feat: add practice session data layer
7cd8926  docs: align project documentation
bc9e6db  perf: add route-level code splitting
```

---

## Blocked

| 项 | 状态 |
| --- | --- |
| 完整 SQL 备份 | **已解除阻塞（2026-09-16）**：用户决定不再把 SQL 备份作为线上变更的前置条件。 |

> 背景：此前 `npx supabase db dump --linked` 在本沙箱反复失败（长连接被中断、落盘 0 字节），
> 一直卡着任何线上数据库变更。用户已明确：**不用 SQL 备份了**。
>
> 因此 Phase 6 可以推进数据库变更（RPC / 权限）。
> 用户已于同日删除 `supabase/migrations/` 目录 —— **本项目不再存在 migration 工作流**，
> 变更全部线上执行，因此**每次执行前必须摊开 SQL 给用户确认，跑完立即读回线上状态核对**。

---

## Known Issues

| # | 问题 | 位置 | 归属 |
| --- | --- | --- | --- |
| 1 | 练习结果不可回看：结果只在页面内存里，提交后会话变 `completed`，可恢复查询只认 `active` / `paused`，离开再回来是新会话 | `src/pages/PracticePage.tsx` | Phase 7 |
| 2 | 主观题（翻译 / 写作）不支持在线作答 | `src/components/practice/PracticeQuestion.tsx` | Phase 6 之后 |
| 3 | `mistakes` / `mistake_reviews` 表已建、已授权，但无任何前端代码使用 | 数据库 | Phase 7 |
| 4 | `practice_answers.score` 字段存在但从不写入（`is_correct` 已由 RPC 写入） | 数据库 | 后续 Phase |
| 5 | 首页两个 CTA（「开始学习」/「查看历年真题」）指向同一路由 `/exams` | `src/pages/HomePage.tsx` | 待 Phase 7 学习记录就绪后，可让「开始学习」= 继续上次练习 |
| 6 | 练习页「第 N / M 题（本大题第 N 小题）」两处恒等，属冗余展示（`item_no` 在大题内 1..N） | `src/pages/PracticePage.tsx` | 待打磨 |
| 7 | 判分 RPC 与题库列级权限**不在仓库留痕**（无 migration），重建环境需手工重放 SQL | 线上库 | 已知取舍 |

**已修复（2026-09-16）：**

- 首页「开始学习」无 `onClick` → 已绑定跳转 `/exams`
- 首页「项目初始化成功。」占位文案 → 已删除
- 文档 `/exams/:id` 与代码 `/exams/:paperId` 不一致 → 三份文档统一为 `:paperId`
- 两套 Phase 体系并存 → 已统一到 `docs/phases/`，`.codebuddy/rules/phase-discipline.md` 与 `CODEBUDDY.md` 改为指向它
- `architecture.md` 5 处过时事实（页面清单、路由清单、学习数据表名、§34、§4.2）→ 已对齐真实代码
- 练习页无提交 / 结果，做完不知道对错 → Goal 6.1 / 6.2 已补齐
- `practice_answers.is_correct` 从不写入 → 判分 RPC 已服务端写回
- `practice.md` 示例错写「第 21 小题」→ 已按真实 `item_no`（大题内 1..N）修正

---

## Last Verification

**本次任务**：Phase 6 Goal 6.1 / 6.2 实现 + 全量验证（2026-09-16）。

### 构建门槛

```text
node node_modules/typescript/bin/tsc -b     ✅ 无输出（通过）
pnpm lint                                    ✅ 7 warnings / 0 errors
                                               （全部为本就存在的
                                                only-export-components 警告：
                                                button.tsx ×1 + router/index.tsx ×6）
pnpm build                                   ✅ 174 modules transformed（含 tsc -b）
```

### 线上数据库变更（无 migration，直接执行）

```sql
create function public.grade_practice_section(p_session_id uuid) ... security definer ...
revoke execute on function public.grade_practice_section(uuid) from public;
grant  execute on function public.grade_practice_section(uuid) to authenticated;
```

> ⚠️ 这次是先 `drop function if exists` 再 `create function`。
> 原因是首次以 `CREATE OR REPLACE` 写函数后又想加一个返回列，被
> `42P13 cannot change return type of existing function` 拒绝 ——
> **改返回列必须 DROP 重建，且 DROP 会连带丢掉 EXECUTE 授权，必须重新 GRANT。**

### 浏览器验证（Playwright / Chromium，dev server :5199）

**第一轮 — 作答与结果交互，16/16 通过：**

| 断言 | 结果 |
| --- | --- |
| 找到含选择题的大题（5 题 × 4 选项） | ✅ |
| 作答 3 题后「已作答 3 题」计数正确 | ✅ |
| 结果页「已作答 3 / 5 题」与提交前一致 | ✅ |
| 「答对 1 题 · 答错 2 题」且两数之和 == 已作答 | ✅ |
| 「正确率 33%」且等于 `round(1/3*100)` | ✅ |
| 每题都有「正确答案：」（3 行 / 3 题） | ✅ |
| 未作答文案「未作答 2 题，不参与判分，也不会显示答案。」 | ✅ |
| 每题都有「解析」标题或「本题暂无解析。」 | ✅（解析标题 3 / 暂无 0） |
| **作答阶段 Network 与 DOM 无答案字段泄漏** | ✅ 0 命中 |
| 移动端 375px 无横向溢出（scrollWidth 375 == innerWidth 375） | ✅ |
| console error / 未捕获异常 | ✅ 均为 0 |

**第二轮 — 冷缓存结构级边界核验，10/10 通过：**

用全新 context（空 React Query / HTTP 缓存）直接进练习页，把 `exam_papers` 的响应体
**解析成 JSON 后逐层比对键集合**（比子串扫描强：能区分合法的 `exam_sections.score`
与禁止下发的 `practice_answers.score`）：

```text
paper  层键集合  == {all, id, title, year}
section 层键集合 == 白名单（9/9 全部匹配）
item    层键集合 == 白名单（48/48 全部匹配）
option  层键集合 == 白名单（195/195 全部匹配）
全层级禁止字段   == 0 命中
              （correct_option / explanation / passage_zh / source_data /
                is_correct / reference_translation / source_json）
规模对照         == 9 sections / 48 items / 195 options
```

同时确认 `practice_answers` 的 `select` 白名单里没有 `is_correct` / `score`。

结论：**Phase 2 的答案边界未被破坏**；判分 RPC 是答案的唯一出口。
（另：直接读 `correct_option` 仍返回 `42501`，本回合未复测，沿用上次结论。）

### 测试数据清理

验证过程在 dev 账号（`08a4c6f9-…`）下产生的 `practice_sessions` / `practice_answers`
已全部删除，读回线上为 `remaining_sessions = 0, remaining_answers = 0`。

### 工作区状态

```text
分支        main
HEAD        6e9a400
origin/main 9383666      （本地领先 3 个提交，未推送）
```

**本次改动（均为已修改未提交）：**

```text
M src/pages/PracticePage.tsx              提交动作 + 结果视图 + 会话创建守卫修正
M src/services/practice.ts                PracticeGradeResult + gradePracticeSection
M src/hooks/use-practice-mutations.ts     useGradePracticeSection
M src/types/database.ts                   Functions 增加 grade_practice_section
A src/components/practice/PracticeResult.tsx
```

**用户自己的工作内容（不得清理 / 回滚 / 覆盖）：**

```text
M .codebuddy/CODEBUDDY.md
M .codebuddy/rules/phase-discipline.md
M .workbuddy/memory/2026-09-15.md
M .workbuddy/memory/MEMORY.md
M src/pages/ExamListPage.tsx              （PaperRow 抽取重构，非本次任务）
D docs/database-schema.md
D docs/parse1.md
D docs/parse2.md
D supabase/migrations/*.sql               （6 个基线文件，用户已删）
?? docs/00-product-requirements.md
?? docs/AGENTS.md
?? docs/architecture.md
?? docs/data/  docs/development/  docs/pages/  docs/phases/
?? .workbuddy/memory/2026-09-16.md
```

`git diff --check` 仅报 Git 自身的 LF→CRLF 提示，**无空白错误**。

---

## 备注

- 题库规模基线：17 papers / 153 sections / 816 items / 3290 options
- `item_no` 是**大题内** 1..N 连续编号（阅读 1–5、完形 1–20、新题型 1–5、翻译 / 写作恒为 1），
  17 个年份已逐一核对
- 前端运行时**不读取**：`passage_zh`、`source_data`、`correct_option`、`explanation`、`section_items.extra_data`
- 判分唯一通路：RPC `public.grade_practice_section(uuid)`
- 详见 [`docs/data/README.md`](../data/README.md)、[`docs/pages/practice.md`](../pages/practice.md)
