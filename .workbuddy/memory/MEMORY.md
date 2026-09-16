# English2 项目长期记忆

## 项目定位
考研英语二真题学习系统（2010–2026，17 套）。`D:\workSpace\github\English2`，main 分支。
技术栈：Vite + React 19 + TS6(strict) + Tailwind 4 + shadcn/ui(Base UI) + Supabase + TanStack Query + React Router 7。
脚本：`pnpm dev` / `pnpm build`(= tsc -b && vite build) / `pnpm lint`(oxlint)。

## 架构铁律
- 数据链路只能 `Page → hooks → services → getSupabaseClient()`；**service 是唯一访问 Supabase 的层**。
- `data/exams/` 是源题库（Source of Truth），不可移动/重命名，**但不作为运行时数据源**。
- 路径别名 `@/*`；根 `tsconfig.json` 不写 `baseUrl`（TS6 废弃）。
- 2026-09-16 起已建文档体系：`docs/{phases,pages,development,data}/`。
  **开工顺序：`development/progress.md` → 对应 phase → 对应 page → 代码。**
- ⚠️ **Phase 唯一定义源 = `docs/phases/`**（7 阶段，按用户价值划分）。`.codebuddy/rules/phase-discipline.md`
  与 `CODEBUDDY.md` 里的旧「10 阶段」清单**已废弃**（编号相同含义不同，会取错文档），两处已改为指向 `docs/phases/`。
- 路由参数统一为 `:paperId`（不是 `:id`），三份文档已同步；代码不改。
- 在 `docs/` 根目录的 `architecture.md` 里写相对链接用 `./phases/...`，**不是** `../phases/...`。

## 题库结构（易踩错）
- `data/exams/papers-YYYY.json` 顶层是 **array（长度 9），元素是「大题/section」**，不是 paper。
- 每年恒定 9 大题：4 阅读 + 1 完形 + 1 新题型 + 1 翻译 + 2 写作 → 17 年 = 153 sections / 816 items / 3290 options。
- section 对象键名是 **`id`**（`zy-2010-read-1` / `-cloze` / `-match` / `-trans` / `-write-s` / `-write-b`），**无 `source_id` 键**；item 级 source_id 由 `sync_exam_paper` 生成。
- ⚠️ 命名例外：**2024/2025 小作文是 `zy-YYYY-write-a`**，其余年份 `-write-s`。
- ⚠️ `index.json` 是 **153 条 section 级**条目，**不是 17 套 paper 列表** —— 严禁当 `/exams` 数据源（已踩过坑，见 `docs/development/decisions.md`）。paper 标题按年份派生为 `YYYY年真题`。
- `ans` 是 **0-based**，DB `correct_option` 直接沿用，不做 +1。`item_options` **无 `is_correct`**。
- 结构变体：2 份完形缺 `passage_zh`、2 份新题型无 `passage`、写作有 `chart`/`chart_url`/`sample` 三态 → 渲染层需容错。

## 前端数据契约
- 类型全在 `src/services/exams.ts`，基于 `Pick<Tables<...>, 白名单>`，**不手写第二套 DB 类型**。
  公开 DTO：`ExamPaper`= id|year|title；`ExamSection`= id|paper_id|source_id|type|title|score|minutes|intro|passage|prompt|tips|extra_data|sort_order（**无 passage_zh**）；`ExamItem`= id|item_no|item_type|content；`ExamOption`= id|option_index|content。
- 返回结构：`ExamPaperDetail = paper & { sections: (section & { items: (item & { options })[] })[] }`（DB 键名 `exam_sections`/`section_items`/`item_options` 被改名为 `sections`/`items`/`options`）。
- Service：`getCurrentExamPapers()`（is_current=true + year DESC）、`getExamPaperById(id)`（四层，不存在返 null，DB 错误 throw）。
- **排序契约（硬性）**：sections→`sort_order`、items→`item_no`（`section_items` 没有 sort_order！）、options→`option_index`，全升序；服务端 `referencedTable` + 客户端 `toExamPaperDetail()` 双保险。
- 查询一律显式列白名单（`PAPER_LIST_SELECT` / `PAPER_DETAIL_SELECT`），**禁止 `*`**；`toExamPaperDetail()` 逐字段重建（不 `...row`）作第二道防线。
- 详情查询用**嵌入别名 `all:exam_sections(...)`**；⚠️ `.order(..., { referencedTable: 'all' })` **必须用别名前缀**，用真实表名会 `400 'section_items' is not an embedded resource`。
- 错误文案：`toExamErrorMessage(error: unknown)` 是**唯一**解读底层错误的地方，页面只能 `description={toExamErrorMessage(error)}`。Practice 域另有 `toPracticeErrorMessage` / `PracticeError`。
- PostgREST 边界（实测）：✅ 同关系重复嵌入（**必须带别名**）、按别名过滤；❌ select 内 SQL 函数（`coalesce`→`400 PGRST100`）、无名重复嵌入（`400 42803`）。
- Practice 域契约：`PracticeGradeResult = { itemId, itemNo, itemType, isCorrect: boolean|null, selectedOption: number|null, correctOption: number|null, explanation: string|null, referenceTranslation: string|null }`（camelCase，`gradePracticeSection()` 逐字段重建，不 `...row`）。
  `isCorrect === null` 即主观题（不判分），渲染层据此分派。

## 答案边界（不可回退）
- 前端运行时**不读取**：`exam_sections.passage_zh`、`exam_sections.source_data`（153 大题里 **102 个含 ans/explain**）、`section_items.correct_option`(0-based) / `explanation` / `extra_data`（翻译题含 `reference_translation`）、`exam_papers` 除 id/year/title 外的列、`practice_answers.is_correct` / `score`。
- 实现方式：应用层列白名单 + DTO，**加数据库列级 GRANT/REVOKE**（不建 View，见 decisions.md）。
- ⚠️ 旧的「双别名 `all` + `zh` + `.neq('zh.type','翻译')`」方案**已废弃**：Phase 5C（`37217cd`）起 `passage_zh` 完全不下发，前端读取与 `REVOKE` 都已执行，非翻译题「中文参考」折叠已下线。
- 翻译判断统一走 `source_id.endsWith('-trans')`，**不要**用中文 `type === '翻译'`。
- ⚠️ Phase 6 的答案出口是**唯一受控通路**：RPC `public.grade_practice_section(p_session_id uuid)`
  （SECURITY DEFINER、`set search_path = public, pg_temp`、先校验 `user_id = auth.uid()`、只返回本次实际作答过的题）。
  **不得**把答案列加回 `exams.ts` 白名单；判分通路与题库浏览通路必须分离。
  `PracticeResult.tsx` 是全站**唯一**允许渲染正确答案/解析的地方，且只在提交后。

## 数据库 / 权限
- Project Ref `btrgtbhiheosntzfjhxh`。
- ⚠️ **用户已豁免（2026-09-16）**：
  - **不写 migration** —— 数据库变更直接用 `npx supabase db query --linked` 在线上执行，**不落 `supabase/migrations/`**。
    （这条覆盖了 `docs/architecture.md` §35 与 `docs/AGENTS.md` §16 的 migration 要求，是用户显式决定。）
    代价：变更在仓库中不可追溯、不可回滚。执行前务必先 `git status` 并告知用户实际改了什么。
  - **不做 SQL 备份** —— 不再把 `supabase db dump` 作为线上变更的前置条件。
- 8 表：`exam_papers`/`exam_sections`/`section_items`/`item_options`（题库，authenticated 仅 SELECT）+ `practice_sessions`/`practice_answers`/`mistakes`/`mistake_reviews`（学习数据，RLS 限 `auth.uid()=user_id`，authenticated 有 DML）。
- **不再新增 migration**（用户已删除整个 `supabase/migrations/` 目录）。
- ⚠️ **同步需 `service_role` 或 postgres 通道**（`sync_exam_paper` 是 SECURITY INVOKER，authenticated 无写权限）。前端绝不允许出现 service_role。
- RPC `sync_exam_paper(p_source_id, p_source_file, p_content_hash, p_year, p_title, p_source_json)`，靠 content_hash 幂等（同 hash 提前 return 不改 version/source_file；异 hash → version+1、旧行 is_current=false）。
- 已知残留：2010 的 `source_file` 仍是旧路径（unchanged 分支不 UPDATE，修不了，用户未授权改动）。
- ~~全量 SQL 备份~~ **已不需要**：用户 2026-09-16 决定解除，`docs/development/progress.md` 已同步。

## UI 契约
- 路由（**参数是 `:paperId` 不是 `:id`**）：`/login`、`/`、`/exams`、`/exams/:paperId`、`/exams/:paperId/practice/:sectionId`、`*`。
- 组件：`src/components/exams/` 下 `ExamSection`（按 type 分派）/ `PassageText` / `ChoiceQuestion` / `TextQuestion` / `json-utils.ts`（运行时窄化 extra_data，**不用类型断言**）；`src/components/practice/PracticeQuestion.tsx`。
- `chart` 三态：结构化对象（**仅 2024/2025 write-b**）、布尔（其他年份）、缺失；`chart_url` 仅 2013/2014 大作文。`readStructuredChart` 只认非空 items 数组。
- **禁止按 `sort_order` 推断题型**；小题数恒为 5/20/5/1/1；新题型共用 `extra_data.titles`（2010 仅 2 项，其余 7 项）。
- 去重：翻译 `section.passage` ≡ 唯一 text item `content`；写作 `prompt`/`tips` 同理 → 归一化后只渲染一次。
- Practice 当前**不判分、不显示答案**；主观题显示占位说明。

## 验证技巧（非显而易见）
- **Vite `ssrLoadModule` 可在 Node 跑真实前端模块**：`createServer({root, configFile, server:{middlewareMode:true}, appType:'custom'})` + `server.ssrLoadModule('/src/services/exams.ts')`，会解析 `@/`、注入 `.env.local`；同一模块图共享 client，可 `signInWithPassword` 后跑真实 authenticated 查询。
- **浏览器验证用 Python Playwright**（托管 venv `C:\Users\BSI\.workbuddy\binaries\python\envs\default\Scripts\python.exe`，浏览器已装）。dev server 用 `pnpm dev --port <p> --strictPort`，**只用 `http://localhost:<p>`，`127.0.0.1` 连不上**。
- 断言详情页前用 `waitForFunction(() => document.querySelectorAll('main div[data-slot="card"]').length >= 9)`，别用 `waitForSelector`（列表页残 DOM 会立刻返回）。
- **抓 response body 要防竞态**：回调里同步入队，body 用 promise 携带（`entry._p = res.text().then(...)`），读取前 `waitForLoadState('networkidle')`。
- `maybeSingle()` 的 raw body 是**单元素数组**，断言要 `body[0]`。
- **答案泄露扫描看「JSON 键」而非子串**：`explanation` 子串会误报（选项正文里出现过 "sensible explanation"）。子串级只保留 snake_case 复合词（`correct_option`/`reference_translation`/`source_data`/`is_correct`）。
  ⚠️ 子串扫描还会**误报 `score`**：`exam_sections.score`（大题分值）是合法公开列。**更强做法是结构级核验** ——
  把响应体 `json.loads()` 后逐层断言键集合恰等于白名单（`paper == {all,id,title,year}`、section / item / option 各自白名单），
  再递归 walk 一遍断言禁止字段 0 命中。这能区分"合法列"与"漏列"，比正则可靠得多。
  冷启动别忘了：**React Query 缓存会让第二次进入不再发请求**，泄漏扫描必须在**全新 context**（空缓存）里做，
  并用正向对照（`"item_no" in body`）确认真的抓到了载荷。
- Playwright **Python** 版在 `page.on("response")` 回调里可以**同步** `res.text()`（无需 JS 版那套 promise 携带写法），失败时 try/except 兜住即可。
- 错误注入：`route.abort()` 模拟网络失败；`route.fulfill(status=...)` 必须补 CORS 头并对 `OPTIONS` 单独 `fulfill(204)`，否则伪装成网络错误。React Query 默认 retry 3 次（≈7s），等错误态要给足超时。
- 判分 RPC：`public.grade_practice_section(p_session_id uuid)` → `returns table(item_id uuid, item_no int, item_type text, is_correct boolean, selected_option int, correct_option int, explanation text, reference_translation text)`。
  已 `revoke execute ... from public` + `grant execute ... to authenticated`。
  ⚠️ **改返回列必须 `drop function` 再 `create`**：`CREATE OR REPLACE` 会报
  `42P13 cannot change return type of existing function`；而 DROP 会连带丢掉 EXECUTE 授权，**必须重新 GRANT**。
- 只读查线上库：`npx supabase db query --linked -f <sql> -o csv`（**不需要 `--project-ref`**，linked 即可）；
  ⚠️ 该通道**也能执行写操作**（已实测 DELETE 生效），所以每次执行前必须把 SQL 摊给用户看、跑完立即读回核对。
  落盘文件在 `supabase/.temp/`（用户删了 migrations 但 `.temp` 还在，链接未断）。

## 环境坑位（Windows）
- **Bash 工具 PATH 不完整**（缺 `head`/`sed`/`dirname`/`ls`/`grep`）→ 一律走 PowerShell 工具；输出被吞时写文件再 Read。（Grep/Glob/Read 工具不受影响。）
- HTTPS push 失败（`cannot spawn sh`）→ 用 SSH：`git push git@github.com:harmsworth/English2.git main`。
- `pnpm exec tsc -b` 偶发失败 → `node node_modules/typescript/bin/tsc -b`；`pnpm build` 内部正常。
- PowerShell 里 `python ... > file` 会乱码 → 脚本自己 `json.dump(..., ensure_ascii=False)` 写 UTF-8 再 Read。

## 工作区纪律
- 用户常在 `.workbuddy/`、`docs/` 下有**未提交/未跟踪的在制品**。任何任务都**不得**删除、覆盖、回滚、`git add .`、`git clean`、commit、push（除非明确要求）。
- 开工先 `git status`，收尾再 `git status` / `git diff` / `git diff --check`。
