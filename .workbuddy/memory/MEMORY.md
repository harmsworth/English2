# English2 项目长期记忆

## 项目定位
考研英语二真题学习系统（2010–2026，17 套）。`D:\workSpace\github\English2`，main 分支。
Vite + React 19 + TS6(strict) + Tailwind 4 + shadcn/ui(Base UI) + Supabase + TanStack Query + React Router 7 + oxlint。
`pnpm dev` / `build`(= tsc -b && vite build) / `lint` / `db:types`。
**Phase 1–7 全部 done（Phase 7 E2E 52/52 通过）。** 设计重构方案见 `docs-next/`（4 份文档，尚未动代码）。

## 架构铁律
- 数据链路只能 `Page → hooks → services → getSupabaseClient()`；**service 是唯一访问 Supabase 的层**。
- `data/exams/` 是源题库（不可移动/重命名），**不作运行时数据源**；路径别名 `@/*`，根 tsconfig 不写 `baseUrl`。
- **开工顺序：`docs/development/progress.md` → phase → page → 代码。**
- ⚠️ Phase 唯一定义源 = `docs/phases/`（7 阶段）；`.codebuddy/rules/phase-discipline.md` 与 `CODEBUDDY.md` 的旧「10 阶段」清单已废弃。
- 路由参数统一 `:paperId`；docs 根目录写相对链接用 `./phases/...`。

## 题库结构（易踩错）
- `papers-YYYY.json` 顶层是 **array(9)，元素是「大题/section」**不是 paper；每年恒定 9 大题（4 阅读+完形+新题型+翻译+2 写作）。
- section 键是 `id`（`zy-2010-read-1`/`-cloze`/`-match`/`-trans`/`-write-s`/`-write-b`），**无 source_id**（由 `sync_exam_paper` 生成）。⚠️ 2024/2025 小作文是 `-write-a`。
- ⚠️ `index.json` 是 **153 条 section 级**条目，**不是 paper 列表** —— 严禁当 `/exams` 数据源（已踩坑）。
- `ans` **0-based** → DB `correct_option` 直接沿用；`item_options` 无 is_correct。
- `item_no` 是**大题内 1..N**（5/20/5/1/1），**非全局题号**；**禁止按 sort_order 推断题型**。
- 变体：2 份完形缺 passage_zh、2 份新题型无 passage、写作 chart/chart_url/sample 三态。
- 翻译 17/17 有 `extra_data.reference_translation`，**全无 explanation/correct_option**；写作 sample 只在 2024/2025 的 4 个大题，在 `exam_sections.extra_data`。
- 去重：翻译 `section.passage` ≡ 唯一 text item content；写作 prompt/tips 同理 → 只渲染一次。

## 前端数据契约
- 类型全在 `src/services/exams.ts`，基于 `Pick<Tables<...>, 白名单>`，**不手写第二套 DB 类型**。`ExamSection` **无 passage_zh**。
- `ExamPaperDetail = paper & { sections: (section & { items: (item & { options })[] })[] }`。
- **排序契约（硬性）**：sections→sort_order、items→**item_no**（section_items 无 sort_order！）、options→option_index，全升序；服务端 referencedTable + 客户端 `toExamPaperDetail()` 双保险。
- 查询一律显式白名单，**禁止 `*`**；`toExamPaperDetail()` 逐字段重建（不 `...row`）。
- 详情用嵌入别名 `all:exam_sections(...)`；⚠️ `.order(..., { referencedTable: 'all' })` **必须用别名**，真实表名报 `400 not an embedded resource`。
- 错误文案：`toExamErrorMessage`/`toPracticeErrorMessage`/`toMistakeErrorMessage` 是各域唯一解读处；页面只写 `description={toXxxErrorMessage(error)}`。
- PostgREST：✅ 同关系重复嵌入（必须带别名）；❌ select 内 SQL 函数（`coalesce`→400 PGRST100）、无名重复嵌入（400 42803）。
- `src/types/database.ts` 是**纯 codegen（不手改）**；codegen 对 RETURNS TABLE 推非空 ⇒ null 收敛统一落在 **service DTO 层**（`row.is_correct ?? null`）。
- Practice：`PracticeGradeResult` camelCase，`isCorrect === null` = 主观题。`practice_answers` **无「选项/文本二选一」CHECK** ⇒ 纯文本/纯标记行合法（主观题无需 DDL）。

## 答案边界（不可回退）
- 前端**不读取**：`exam_sections.passage_zh`/`source_data`、`section_items.correct_option`/`explanation`/`extra_data`、`exam_papers` 除 id/year/title、`practice_answers.is_correct`/`score`。实现：列白名单 + DTO + 列级 GRANT/REVOKE（不建 View）。
- 翻译判断走 `source_id.endsWith('-trans')`，**不用**中文 `type === '翻译'`。
- 答案唯一出口 = RPC `grade_practice_section(uuid)`（SECURITY DEFINER、校验 auth.uid()、只返回实际作答过的题）。`PracticeResult.tsx` 是全站**唯一**可渲染答案/解析处，且仅在提交后。
- ⚠️ `/mistakes` **刻意不展示答案与解析**（MistakeCard DTO 里没有这些列）；对照答案只能走「重做 → 判分」。
- 「中文参考」折叠已下线（Phase 5C `37217cd`），passage_zh 完全不下发。

## 数据库 / 权限
- Project Ref `btrgtbhiheosntzfjhxh`。
- ⚠️ **用户豁免（2026-09-16）**：**不写 migration**（变更直接 `npx supabase db query --linked` 线上执行，不落 `supabase/migrations/`）；**不做 SQL 备份**。代价：不可追溯/不可回滚 ⇒ 执行前 git status、把 SQL 摊给用户、跑完立即读回核对。
- 8 表：题库 4（`exam_papers`/`exam_sections`/`section_items`/`item_options`，authenticated 仅 SELECT）+ 学习 4（`practice_sessions`/`practice_answers`/`mistakes`/`mistake_reviews`，RLS own-only + 完整 DML）。
- ⚠️ 同步需 **service_role/postgres 通道**；前端绝不出现 service_role。
- `mistakes`：`status` CHECK(active|reviewing|mastered|removed) 默认 active；**UNIQUE(user_id,item_id)**（收录靠它 upsert）；item_id FK **RESTRICT**；**有 `mistakes_updated_at` 触发器 ⇒ service 不要手写 updated_at**。`mistake_reviews` 无 updated_at/触发器，mistake_id FK CASCADE。
- `grade_practice_section` 流程：判分写回 → **错题收录**（`on conflict (user_id,item_id) do update`，只收 choice + correct_option 非 null + is_correct=false；原 removed 则复活为 active）→ session 置 completed。改 body 用 `create or replace`；⚠️ **改返回列必须 drop + 重新 GRANT**。

## UI 契约
- 路由：`/login`、`/`、`/exams`、`/exams/:paperId`、`/exams/:paperId/practice/:sectionId`、`/mistakes`、`*`。
- 查询键集中 `src/lib/constants.ts`：`examKeys`/`practiceKeys`/`mistakeKeys`；状态类 mutation invalidate `xxxKeys.all`。
- 练习页（已判分，答题/结果共路由）：
  - `answeredCount` = 「选过选项」**或**「标记过完成」逐题判定；⚠️ 不能用 `savedByItem.size`（主观题 selected_option 恒 null ⇒ 翻译大题计数恒 0、按钮永禁）。
  - `canSubmit = hasChoiceItems || source_id.endsWith('-trans')`；⚠️ 不能用 `!hasChoiceItems`（写作题会长出假提交按钮）。
  - 翻译「标记已完成」= upsert `text_answer=''`/`selected_option=null` 纯标记行；撤销 = `deletePracticeAnswer()` **真删行**（只改本地 state 不够）。
  - `PracticeQuestion` 的 `onToggleTextAnswer` **不传则不渲染按钮**（防死按钮）。
- 错题页三视图由 `groupOfStatus(status)` 派生（active+reviewing→open）；卡片操作按 status 显隐；`lastSelectedOption` 来自 practice_answers 回查，**不是答案泄露**。

## 验证技巧
- **Vite `ssrLoadModule` 可在 Node 跑真实前端模块**（解析 `@/`、注入 `.env.local`、共享 client 可登录后跑 authenticated 查询）。
- 浏览器验证用 **Python Playwright**（`…\python\envs\default\Scripts\python.exe`）；dev server 只用 `http://localhost:<p>`（127.0.0.1 连不上）。
- **答案泄露扫描必须结构级**：响应 json 后断言**键集合恰等于白名单**，再递归 walk 禁字段 0 命中（子串法会误报）；必须在**全新 context**（React Query 缓存会让二次进入不发请求）+ 正向对照（`"item_no" in body`）。
- 错误注入：`route.fulfill(status=...)` 必须补 CORS 头并对 OPTIONS 单独 fulfill(204)，否则伪装成网络错误；React Query 默认 retry 3 次（≈7s）。
- ⚠️ 空结果 + 非零退出码 ≠ 查询成功无数据（查 information_schema.triggers 曾误判）→ 用「无论有无数据都返回行」的查询交叉验证。
- 收尾必须清理 dev 账号测试数据并读回 `remaining = 0`。

## 环境坑位（Windows）
- **Bash 工具 PATH 不完整**（缺 date/ls/dirname/sed）→ 一律用 PowerShell 工具；输出被吞时写文件再 Read。
- push 失败（`cannot spawn sh`）→ SSH：`git push git@github.com:harmsworth/English2.git main`；显式 URL 推送**不更新** origin/main，需手动 fetch 刷新。
- `pnpm exec tsc -b` 偶发失败 → `node node_modules/typescript/bin/tsc -b`；脚本落盘用 `json.dump(ensure_ascii=False)` 写 UTF-8；线上 SQL 一律**英文注释**（CLI 通道中文会乱码）。

## 工作区纪律
- 用户常在 `.workbuddy/`、`docs/` 下有未提交在制品：任何任务**不得**删除/覆盖/回滚/`git add .`/`git clean`/commit/push（除非明确要求）。
- 开工先 `git status`，收尾再 `git status` / `git diff` / `git diff --check`。
