# English2 项目长期记忆

## 项目定位
考研英语二真题学习系统（2010–2026，17 套）。`D:\workSpace\github\English2`，main 分支。
Vite + React 19 + TS6(strict) + Tailwind 4 + shadcn/ui(Base UI) + Supabase + TanStack Query + React Router 7。
`pnpm dev` / `pnpm build`(= tsc -b && vite build) / `pnpm lint`(oxlint) / `pnpm db:types`(supabase gen types)。
**现状：Phase 1–5 `done`；Phase 6 `in-progress`（Goal 6.0–6.4 全部完成，可收口）；下一步 Phase 7。**

## 架构铁律
- 数据链路只能 `Page → hooks → services → getSupabaseClient()`；**service 是唯一访问 Supabase 的层**。
- `data/exams/` 是源题库（Source of Truth），不可移动/重命名，**但不作为运行时数据源**。
- 路径别名 `@/*`；根 `tsconfig.json` 不写 `baseUrl`（TS6 废弃）。
- **开工顺序：`docs/development/progress.md` → 对应 phase → 对应 page → 代码。**
- ⚠️ **Phase 唯一定义源 = `docs/phases/`**（7 阶段，按用户价值划分）。`.codebuddy/rules/phase-discipline.md`
  与 `CODEBUDDY.md` 的旧「10 阶段」清单**已废弃**（编号相同含义不同，会取错文档），两处已改为指向 `docs/phases/`。
- 路由参数统一 `:paperId`（不是 `:id`）；在 `docs/` 根目录写相对链接用 `./phases/...` 而非 `../phases/...`。

## 题库结构（易踩错）
- `data/exams/papers-YYYY.json` 顶层是 **array（长度 9），元素是「大题/section」**，不是 paper。
- 每年恒定 9 大题：4 阅读 + 1 完形 + 1 新题型 + 1 翻译 + 2 写作 → 17 年 = **153 sections / 816 items / 3290 options**。
- section 键名是 **`id`**（`zy-2010-read-1`/`-cloze`/`-match`/`-trans`/`-write-s`/`-write-b`），**无 `source_id`**；source_id 由 `sync_exam_paper` 生成。
  ⚠️ 命名例外：**2024/2025 小作文是 `zy-YYYY-write-a`**，其余年份 `-write-s`。
- ⚠️ `index.json` 是 **153 条 section 级**条目，**不是 17 套 paper 列表** —— 严禁当 `/exams` 数据源（已踩坑）。paper 标题按年份派生 `YYYY年真题`。
- `ans` 是 **0-based**，DB `correct_option` 直接沿用，不做 +1。`item_options` **无 `is_correct`**。
- `item_no` 是**大题内 1..N**（阅读 1–5、完形 1–20、新题型 1–5、翻译/写作恒 1），17 年已逐一核对，**不是全局题号**。
  小题数恒为 5/20/5/1/1；新题型共用 `extra_data.titles`（2010 仅 2 项，其余 7 项）。**禁止按 `sort_order` 推断题型**。
- 结构变体（渲染层需容错）：2 份新题型无 `passage`、写作 `chart`/`chart_url`/`sample` 三态。
- 主观题参考内容分布：翻译题 17/17 都有 `section_items.extra_data.reference_translation`（270–350 字），
  但**全无 `explanation`、全无 `correct_option`**；写作范文 `sample` **只在 2024/2025 的 4 个大题**里，且放在**公开可读的 `exam_sections.extra_data`**（其余 13 年无范文）。
- 去重：翻译 `section.passage` ≡ 唯一 text item `content`；写作 `prompt`/`tips` 同理 → 归一化后只渲染一次。

## 前端数据契约
- 类型全在 `src/services/exams.ts`，基于 `Pick<Tables<...>, 白名单>`，**不手写第二套 DB 类型**。
  ⚠️ `ExamSection` **无 `passage_zh`**；其余 DTO 字段见文件（`ExamPaper`=id|year|title、`ExamItem`=id|item_no|item_type|content、`ExamOption`=id|option_index|content）。
- `ExamPaperDetail = paper & { sections: (section & { items: (item & { options })[] })[] }`（DB 键 `exam_sections`/`section_items`/`item_options` 改名 `sections`/`items`/`options`）。
- Service：`getCurrentExamPapers()`（is_current=true + year DESC）、`getExamPaperById(id)`（四层，不存在返 null，DB 错误 throw）。
- **排序契约（硬性）**：sections→`sort_order`、items→`item_no`（`section_items` **没有** sort_order！）、options→`option_index`，全升序；服务端 `referencedTable` + 客户端 `toExamPaperDetail()` 双保险。
- 查询一律显式列白名单（`PAPER_LIST_SELECT`/`PAPER_DETAIL_SELECT`），**禁止 `*`**；`toExamPaperDetail()` 逐字段重建（不 `...row`）。
- 详情用**嵌入别名 `all:exam_sections(...)`**；⚠️ `.order(..., { referencedTable: 'all' })` **必须用别名前缀**，用真实表名报 `400 'section_items' is not an embedded resource`。
- 错误文案：`toExamErrorMessage(error: unknown)` 是**唯一**解读底层错误的地方；Practice 域另有 `toPracticeErrorMessage` / `PracticeError`。
- PostgREST 边界（实测）：✅ 同关系重复嵌入（**必须带别名**）、按别名过滤；❌ select 内 SQL 函数（`coalesce`→`400 PGRST100`）、无名重复嵌入（`400 42803`）。
- Practice 域：`PracticeGradeResult = { itemId, itemNo, itemType, isCorrect: boolean|null, selectedOption, correctOption, explanation, referenceTranslation }`（camelCase，`gradePracticeSection()` 逐字段重建）。`isCorrect === null` 即主观题（不判分）。
- `practice_answers` 列：`selected_option(int?)/text_answer(text?)/is_correct(bool?)/score(numeric?)/time_spent_seconds(int NOT NULL DEFAULT 0)` + 时间戳。
  约束只有 `selected_option IS NULL OR >=0`、`score IS NULL OR >=0`、`time_spent_seconds >=0`、`UNIQUE(session_id,item_id)`；`session_id` FK **CASCADE**、`item_id` FK RESTRICT。
  ⚠️ **没有「selected_option / text_answer 二选一」CHECK** ⇒ 纯文本 / 纯标记行合法（写主观题无需 DDL）。
- `src/types/database.ts` 是**纯 codegen 产物（不手改）**；codegen **对 `RETURNS TABLE` 一律推非空**，
  null 收敛统一落在 **service DTO 层**（`row.is_correct ?? null`）。不要把 `| null` 写回 `database.ts`，UI 也不假设非空。
- 判分 RPC 的 `return query` **不含 `pa.text_answer`** ⇒ 结果页看不到"我的译文"，只有参考译文。

## 答案边界（不可回退）
- 前端运行时**不读取**：`exam_sections.passage_zh`、`exam_sections.source_data`（153 大题里 102 个含 ans/explain）、`section_items.correct_option`(0-based)/`explanation`/`extra_data`（翻译题含 reference_translation）、`exam_papers` 除 id/year/title 外的列、`practice_answers.is_correct`/`score`。
- 实现方式：应用层列白名单 + DTO，**加数据库列级 GRANT/REVOKE**（不建 View，见 decisions.md）。
- 旧的「双别名 `all` + `zh` + `.neq('zh.type','翻译')`」方案**已废弃**（Phase 5C `37217cd`：passage_zh 完全不下发，前端读取与 REVOKE 都已执行，「中文参考」折叠已下线）。
- 翻译判断统一走 `source_id.endsWith('-trans')`，**不要**用中文 `type === '翻译'`。
- 答案出口是**唯一受控通路**：RPC `public.grade_practice_section(p_session_id uuid)`（SECURITY DEFINER、`set search_path = public, pg_temp`、先校验 `user_id = auth.uid()`、只返回本次实际作答过的题）。
  **不得**把答案列加回 `exams.ts` 白名单；`PracticeResult.tsx` 是全站**唯一**允许渲染正确答案/解析的地方，且只在提交后。

## 数据库 / 权限
- Project Ref `btrgtbhiheosntzfjhxh`。
- ⚠️ **用户豁免（2026-09-16）**：**不写 migration**（变更直接 `npx supabase db query --linked` 线上执行，不落 `supabase/migrations/`，该目录已被用户删除）；**不做 SQL 备份**（`supabase db dump` 不再是前置条件，此前实测在本沙箱反复失败）。
  覆盖了 `architecture.md` §35 与 `AGENTS.md` §16。代价：变更在仓库不可追溯/不可回滚 ⇒ 执行前先 `git status`、把 SQL 摊给用户、跑完立即读回线上核对。
- 8 表：`exam_papers`/`exam_sections`/`section_items`/`item_options`（题库，authenticated 仅 SELECT）+ `practice_sessions`/`practice_answers`/`mistakes`/`mistake_reviews`（学习数据，RLS 限 `auth.uid()=user_id`，authenticated 有 DML）。
- ⚠️ **同步需 `service_role` 或 postgres 通道**（`sync_exam_paper` 是 SECURITY INVOKER，authenticated 无写权限）。前端绝不允许出现 service_role。
- `sync_exam_paper(...)` 靠 content_hash 幂等（同 hash 提前 return；异 hash → version+1、旧行 is_current=false）。已知残留：2010 的 `source_file` 仍是旧路径（unchanged 分支不 UPDATE，修不了）。

## UI 契约
- 路由（**`:paperId`**）：`/login`、`/`、`/exams`、`/exams/:paperId`、`/exams/:paperId/practice/:sectionId`、`*`。
- 组件：`src/components/exams/` 下 `ExamSection`（按 type 分派）/`PassageText`/`ChoiceQuestion`/`TextQuestion`/`json-utils.ts`（运行时窄化 extra_data，**不用类型断言**）；`src/components/practice/` 下 `PracticeQuestion.tsx`（choice/text 分派）/`PracticeResult.tsx`（纯展示）。
- `chart` 三态：结构化对象（**仅 2024/2025 write-b**）、布尔（其他年份）、缺失；`chart_url` 仅 2013/2014 大作文。`readStructuredChart` 只认非空 items 数组。
- **练习页已判分（Phase 6）**，两个视图共用同一路由：答题视图 →（提交）→ 结果视图。
  - `answeredCount` = 「选过选项」**或**「标记过完成」逐题判定；⚠️ 不能用 `savedByItem.size`（主观题 `selected_option` 恒 null ⇒ 翻译大题计数恒 0、提交按钮永远禁用）。
  - `canSubmit = hasChoiceItems || source_id.endsWith('-trans')`；⚠️ 不能用 `!hasChoiceItems`（会把写作题当成翻译题，长出假提交按钮）。
  - 翻译题（`-trans`）有「标记已完成作答」按钮 → upsert 一条 `text_answer=''`、`selected_option=null` 的**纯标记行**；
    撤销 = `deletePracticeAnswer()` **真删行**（只改本地 state 不够，行还在就仍能看到参考译文）。
  - 写作题无标记按钮、无提交按钮（范文在详情页；`canSubmit` false）。
  - `PracticeQuestion` 的 `onToggleTextAnswer` **不传则不渲染按钮** —— 防「看着能点、点了没反应」的死按钮（静默失败最难查）。

## 验证技巧（非显而易见）
- **Vite `ssrLoadModule` 可在 Node 跑真实前端模块**：`createServer({root, configFile, server:{middlewareMode:true}, appType:'custom'})` + `server.ssrLoadModule('/src/services/exams.ts')`，会解析 `@/`、注入 `.env.local`；同一模块图共享 client，可 `signInWithPassword` 后跑真实 authenticated 查询。
- **浏览器验证用 Python Playwright**（托管 venv `C:\Users\BSI\.workbuddy\binaries\python\envs\default\Scripts\python.exe`）。dev server `pnpm dev --port <p> --strictPort`，**只用 `http://localhost:<p>`，`127.0.0.1` 连不上**。
- 断言详情页用 `waitForFunction(() => document.querySelectorAll('main div[data-slot="card"]').length >= 9)`，别用 `waitForSelector`（列表页残 DOM 会立刻返回）。
- Playwright **Python** 版在 `page.on("response")` 回调里可**同步** `res.text()`（无需 JS 版的 promise 携带写法），try/except 兜住即可；读取前仍应 `waitForLoadState('networkidle')`。
- `maybeSingle()` 的 raw body 是**单元素数组**，断言要 `body[0]`。
- **答案泄露扫描必须结构级**：子串法会误报（`explanation` 出现在选项正文；`score` 命中合法的 `exam_sections.score`）。
  做法：响应体 `json.loads()` 后逐层断言**键集合恰等于白名单**（`paper == {all,id,title,year}`、section/item/option 各自白名单），再递归 walk 断言禁止字段 0 命中。
  ⚠️ **React Query 缓存会让第二次进入不再发请求** ⇒ 泄漏扫描必须在**全新 context**（空缓存）里做，并用正向对照（`"item_no" in body`）确认真抓到了载荷。
- 错误注入：`route.abort()` 模拟网络失败；`route.fulfill(status=...)` 必须补 CORS 头并对 `OPTIONS` 单独 `fulfill(204)`，否则伪装成网络错误。React Query 默认 retry 3 次（≈7s），等错误态要给足超时。
- 判分 RPC：`grade_practice_section(uuid)` → 8 列 `item_id/item_no/item_type/is_correct/selected_option/correct_option/explanation/reference_translation`；`revoke execute from public` + `grant execute to authenticated`。
  ⚠️ **改返回列必须 `drop function` 再 `create`**：`CREATE OR REPLACE` 报 `42P13 cannot change return type of existing function`；DROP 会连带丢 EXECUTE 授权，**必须重新 GRANT**。
- 线上库读/写：`npx supabase db query --linked -f <sql> -o csv`（**不需要 `--project-ref`**）；⚠️ 该通道**也能执行写操作**（实测 DELETE 生效），落盘在 `supabase/.temp/`。

## 环境坑位（Windows）
- **Bash 工具 PATH 不完整**（缺 `date`/`ls`/`dirname`/`head`/`sed`/`grep`）→ 一律走 PowerShell 工具；输出被吞时写文件再 Read。（Grep/Glob/Read 不受影响。）
- HTTPS push 失败（`cannot spawn sh`）→ 用 SSH：`git push git@github.com:harmsworth/English2.git main`。
- `pnpm exec tsc -b` 偶发失败 → `node node_modules/typescript/bin/tsc -b`；`pnpm build` 内部正常。
  脚本落盘用 `json.dump(..., ensure_ascii=False)` 写 UTF-8，别靠 shell 重定向（会乱码）。

## 工作区纪律
- 用户常在 `.workbuddy/`、`docs/` 下有**未提交/未跟踪的在制品**：任何任务都**不得**删除、覆盖、回滚、`git add .`、`git clean`、commit、push（除非明确要求）。
- 开工先 `git status`，收尾再 `git status` / `git diff` / `git diff --check`。
