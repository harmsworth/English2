# English2 项目长期记忆

## 项目定位
考研英语二真题学习系统。仓库 `harmsworth/English2`（main 分支），工作区 `D:\workSpace\github\English2`。
技术栈：Vite + React 19 + TypeScript 6（strict）+ Tailwind CSS 4 + shadcn/ui(Base UI, preset nova) + Supabase + TanStack Query + React Router。

## 架构铁律
- 数据链路只能是 `Page → hooks → services → getSupabaseClient()`；**service 层是唯一访问 Supabase 的地方**，页面/Hook 不直接调 `supabase.*`。
- `data/exams/` 是 GitHub 源题库（Source of Truth），**不可移动/重命名**。
- 路径别名用 `@/*`；根 `tsconfig.json` **不要写 `baseUrl`**（TS6 已废弃，只写 `paths`）。

## 题库结构（最重要，容易踩错）
- `data/exams/papers-YYYY.json` 的**顶层是 array（长度 9），元素是"大题/section"，不是 paper**。
- 每年恒定 9 大题：4 阅读理解 + 1 完形填空 + 1 新题型 + 1 翻译 + 2 写作。共 17 年（2010–2026）= 153 sections / 816 items。
- `source_id` 只在 **section 级**：JSON 里 section 对象的键名是 **`id`**（值形如 `zy-2010-read-1`、`-cloze`、`-match`、`-trans`、`-write-s`、`-write-b`），**没有 `source_id` 键**；item 级 source_id 由 `sync_exam_paper` 生成。JSON 内无 paper 级 source_id/year/version/content_hash —— 这些来自 `index.json` / `manifest.json`（manifest 内含每个文件的 sha256）。
- ⚠️ **`index.json` 只有 153 条 section 级 title**（形如 `2010年真题 · Text 1`），**没有 paper 级 title**；paper 级标题需按年份派生为 `YYYY年真题`。
- ⚠️ 命名不一致：**2024 / 2025 小作文 id 是 `zy-YYYY-write-a`**，其余年份是 `-write-s`。
- `ans` 是 **0-based** 下标（新题型指 titles），DB `correct_option` 直接沿用，不做 +1。
- 少量结构变体：2 份完形缺 `passage_zh`、2 份新题型无 `passage`、写作有 `chart` / `chart_url` / `sample` 三种可选字段 → 渲染层需容错。

## 前端数据源与常量
- `src/lib/constants.ts` **只保留 `examKeys`**；`GITHUB_RAW_BASE` / `EXAM_FILES` / `ExamFileName` 已于 `1efbf7b` 删除（确认为死代码）。
- 运行时链路固定为 `React → TanStack Query → services/exams.ts → Supabase`；`data/exams/*.json` **只**用于同步 / 校验 / 审计，**不要再把 GitHub Raw 接回前端**，也不要再维护题库文件清单。
- `.env.local` 中 `VITE_DEV_LOGIN_EMAIL` / `VITE_DEV_LOGIN_PASSWORD` 仅用于开发与同步脚本；`.env.local` 已被 gitignore。

## 前端数据层契约（Phase 4C 建立，**Phase 4E 收窄为公开 DTO**）
- 类型（都在 `src/services/exams.ts` 内基于 `Tables<'...'>` 组合，**不要手写第二套 DB 类型**）：
  `ExamPaper` / `ExamSection` / `ExamItem` / `ExamOption` / `ExamItemWithOptions` / `ExamSectionWithItems` / `ExamPaperDetail`。
- ⚠️ **4E 起这四个基础类型是 `Pick<Tables<...>, 白名单>`，不是整行**。DB 行类型仍保留 `correct_option` / `explanation` / `source_data`，但**公开 DTO 不含**：
  - `ExamPaper` = `id | year | title`
  - `ExamSection` = `id | paper_id | source_id | type | title | score | minutes | intro | passage | passage_zh | prompt | tips | extra_data | sort_order`
  - `ExamItem` = `id | item_no | item_type | content`（**没有** `correct_option` / `explanation` / `extra_data`）
  - `ExamOption` = `id | option_index | content`
- 返回结构：`ExamPaperDetail = paper & { sections: (section & { items: (item & { options: ExamOption[] })[] })[] }` —— 数据库的 `exam_sections` / `section_items` / `item_options` 键名被改名为 `sections` / `items` / `options`。
- Service API：`getCurrentExamPapers(): ExamPaper[]`（is_current=true + year DESC）；`getExamPaperById(id): ExamPaperDetail | null`（**完整四层**，不存在返回 null，数据库错误 throw）。
- Hook API：`useExamPapers()`；`useExamPaper(paperId: string | undefined)`（`enabled: Boolean(paperId)`，queryKey 缺失时用 `examKeys.detail('')` 占位）。
- **排序契约（硬性）**：sections 按 **`sort_order`**、items 按 **`item_no`**（`section_items` **没有** `sort_order`！）、options 按 `option_index`，全部升序。服务端用 `referencedTable` 排序 + 客户端 `toExamPaperDetail()` 再排一次，双保险。
- **查询一律用显式列白名单，禁止 `*`**（`PAPER_LIST_SELECT` / `PAPER_DETAIL_SELECT` 两个 `as const` 常量）。`toExamPaperDetail()` 额外**逐字段重建**（不 `...row`）作第二道防线：即使白名单被改宽也不会自动泄漏。
- 嵌套查询写法（**Phase 4F-1 起为「双别名」**，已实测类型与运行时均可用）：
  `select('id,year,title, all:exam_sections(<公开列，故意不含 passage_zh>, section_items(<列>, item_options(<列>))), zh:exam_sections(id, passage_zh)')`
  + `.neq('zh.type','翻译')`
  + `.order('sort_order', { referencedTable: 'all' })` + `.order('item_no', { referencedTable: 'all.section_items' })` + `.order('option_index', { referencedTable: 'all.section_items.item_options' })`。
  ⚠️ **`referencedTable` 必须用别名前缀**（`all.*`）；继续用真实表名（`exam_sections.*`）会 `400 'section_items' is not an embedded resource in this request`（已实测）。
- **答案载体清单（改查询前必看）**：`section_items.correct_option`（0-based，765 条非空）、`section_items.explanation`、`section_items.extra_data.reference_translation`（17 条翻译）、**`exam_sections.source_data`**（原始题面 JSON，内含 `questions`/`blanks` 的 `ans`+`explain`，**153 个大题里 102 个带答案** ← 最容易漏的大坑）、`exam_sections.passage_zh`（阅读/完形的「中文参考」需要它，但**翻译题的 passage_zh 就是参考答案** —— **Phase 4F-1 起翻译题的 passage_zh 已不再下发**，见下节 F1）。`item_options` **没有** `is_correct`，判题只能用 `correct_option` 与 `option_index` 比对。翻译/写作是 text item，`options` 恒为 `[]`。

## F1：翻译题 passage_zh 网络层隔离（Phase 4F-1，`03516f3`）
- 目标：**翻译题的 `passage_zh`（＝参考译文）不得进入浏览器网络层**，非翻译题仍要拿到 `passage_zh`。
- 方案：**一次请求 + 双别名**。`exam_sections` 在同一次 `select` 里嵌入两次（PostgREST 要求重复嵌入必须带别名）：
  - `all`：完整公开 section + `section_items` + `item_options`，**不含 `passage_zh`**；
  - `zh` ：**只投影 `id, passage_zh`**（不含 `section_items`），并用 `.neq('zh.type','翻译')` 把翻译题挡在外面。
- 合并：`toExamPaperDetail()` 建 `zh` 的 `id → passage_zh` Map，`passage_zh: zhById.get(section.id) ?? null`（翻译题不在 `zh` → `null`）；仍逐字段重建。
- 为什么不用 View / 两次查询：仓库**无 `supabase/migrations/`**（View 需先补迁移基建）；两次查询要客户端合并 + 二次往返。别名方案**零 DDL、单次往返**。
- PostgREST 能力边界（实测）：✅ 同一关系重复嵌入（**必须带别名**）；✅ 按别名过滤（`?zh.type=neq.翻译`）；✅ alias 支持类型层解析（postgrest-js 2.116 的 `ParseQuery`）；❌ select 内 SQL 函数（`coalesce`/`nullif` → `400 PGRST100`）；❌ 无名重复嵌入（`400 42803`）；❌ 用真实关系名过滤会砍掉整个关系（翻译大题从详情页消失，=错误做法）。
- 验收口径：`all`=9 / `zh`=8；翻译 section 对象**无 `passage_zh` 字段**且其 id **不在 `zh`**；响应原文 `"passage_zh"` 出现次数 **= 8**（仅 `zh` 层）；独立断言 —— 翻译参考译文（读自 `data/exams/*.json`）在响应体**与** DOM 中都不出现。

## F6：翻译判断用 `source_id`（Phase 4F-1，`03516f3`）
- `ExamSection.tsx` 中**翻译相关逻辑禁止再依赖中文展示名 `type === '翻译'`**，统一走 `isTranslationSection(sourceId) => sourceId.endsWith('-trans')`（数据契约：`zy-YYYY-trans`）。涉及 3 处：答案隐藏集合、`textItemLabel` 的翻译分支、`zhReference`。
- **其他题型逻辑不要动**：`section.type === '写作'`、`item_type === 'choice'` 保持原样。
- 注意：`exams.ts` 里的 `.neq('zh.type','翻译')` 是 **SQL 过滤值**（跨年份唯一稳定的判别值），属服务端查询，与前端 `source_id` 契约并存、不冲突。

## 题库权限（Phase 4E 收口后，勿回退）
- 四表 `exam_papers` / `exam_sections` / `section_items` / `item_options`：RLS 全部 `true`；**每表只剩 1 条 `authenticated users can read <t>`（SELECT, using=true）策略**；原来的 `authenticated users can manage <t>`（ALL, using=true, with_check=true）已删除。
- 表级 ACL：`authenticated=r`（**仅 SELECT**）、`anon=Dxtm`（拒）、`service_role=arwdDxtm`（有 DML，且 `rolbypassrls=true`）、`postgres` 为 owner。
- 实测：authenticated SELECT 通过（17/153/816/3290），INSERT/UPDATE/DELETE 全部 42501；anon 全 42501；`sync_exam_paper` 对 authenticated 调用 → 42501（函数是 SECURITY **INVOKER**，无表权限即写不动）。
- ⚠️ **同步路径已变**：以前用开发账号（authenticated）跑 `sync_exam_paper`；**现在必须用 `service_role` key（服务端专用，绝不能进前端）或 `postgres`/CLI 通道**。RPC 定义与同步脚本逻辑未改，只是写权限从 authenticated 挪到 service_role。
- ⚠️ **RLS 变更未版本化**：仓库无 `supabase/migrations/`，远程也无 migration 历史。4E 的 DDL 是通过既有 `npx supabase db query --linked --project-ref <ref> -f <sql>` 通道直接作用于线上库的。回滚 SQL 见 `%TEMP%\p4e_rls_rollback.sql`。若将来引入 migrations，需先补齐基线。
- 前端绝不允许出现 `service_role`：`.env.local` 只有 `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` / `VITE_DEV_LOGIN_EMAIL` / `VITE_DEV_LOGIN_PASSWORD`；`public/` 只有 favicon。

## 验证技巧（可复用，非显而易见）
- **Vite `ssrLoadModule` 可在 Node 里直接跑真实前端模块**：用 `createRequire(<repo>/package.json)` 取到 `vite`，`createServer({ root, configFile, server:{middlewareMode:true}, appType:'custom' })`，再 `server.ssrLoadModule('/src/services/exams.ts')` —— Vite 会解析 `@/` 别名、转译 TS 并注入 `.env.local` 的 `import.meta.env`。**同一模块图内 `supabase.ts` 与实际 service 共享同一个 client 实例**，因此可以在脚本里 `getSupabaseClient().auth.signInWithPassword(...)` 让 service 以 authenticated 身份跑真实查询。比手写复刻查询可信得多。
- 浏览器回归：`%TEMP%\p3e2e` 里有现成的 playwright + `channel:'chrome'`（用本机 Chrome）；dev server 用 `pnpm dev`（后台运行），用完按 5173 端口的 owning process 结束它。`Start-Process cmd.exe` 会被安全中心拦截，不要用。

## Supabase
- Project Ref `btrgtbhiheosntzfjhxh`（family-app）。
- RPC `sync_exam_paper(p_source_id, p_source_file, p_content_hash, p_year, p_title, p_source_json jsonb) RETURNS jsonb`，SECURITY INVOKER，靠 content_hash 幂等（version+1、旧行 is_current=false）。
- `item_options` 列为 (id, item_id, option_index, **content**, created_at)，**无 is_correct**；正误只在 `section_items.correct_option`。
- 只读查线上库：`npx supabase db query --linked --project-ref <ref> -f <sql>`（必须同时带 `--linked`）。注意：不支持 `\echo`，多条语句只返回最后一条结果集，建议一条语句一个文件。PowerShell 里需先设 `$OutputEncoding`/`[Console]::OutputEncoding` 为 UTF8，并用 `-o csv` 避免表格边框乱码。
- **全量同步（2010–2026 已完成）**：以 `data/exams/manifest.json` 为唯一驱动源（`files` 提供 sha256 清单），逐份 `papers-YYYY.json` 调用 RPC。参数：`p_source_id=papers-YYYY`、`p_source_file=data/exams/papers-YYYY.json`、`p_content_hash=manifest.files[name]`、`p_year=YYYY`、`p_title=YYYY年真题`、`p_source_json`=原样数组。需以 **authenticated** 账号调用（函数是 INVOKER，靠 authenticated 的 `manage` 策略写库）。脚本放 `%TEMP%`（CJS + `NODE_PATH` 指向仓库 node_modules），顺序执行、失败即停。
- **幂等语义**：hash 相同 → `status='unchanged'` 且**提前 return**，不改 version、**也不会更新 source_file**；hash 不同 → version+1、旧行 is_current=false。
- 线上现状（Phase 4A 后）：exam_papers=17、exam_sections=153、section_items=816（765 choice + 51 text）、item_options=3290；每年 1 行 / 1 条 current / version=1。**唯一残留**：2010 的 `source_file` 仍是旧路径 `content/exams/papers-2010.json`（其余 16 年为 `data/exams/...`）。
- **2010 `source_file` 为什么修不了（Phase 4B 已查明，勿重复调查）**：`sync_exam_paper` 的 `unchanged` 分支是**纯提前 return，分支内没有任何 UPDATE**；`source_file` 只在 INSERT（新版本）路径写入。所以 hash 不变时无法经该函数修正 metadata。可行路径只有：直接 `UPDATE exam_papers`（绕过函数）、改函数 unchanged 分支（需 migration 基建，仓库目前 `supabase/` 只有被忽略的 `.temp/`）、或变更 hash 造 version=2（不可接受）。**用户尚未批准任何一条**，故保持原样。

## 环境坑位（Windows / WorkBuddy）
- **Bash 工具 PATH 不完整**（缺 `head`/`sed`/`dirname`）；`npm`/`npx` 会被安全中心 `wsl.exe` 黑名单拦截 → 所有 pnpm/npx/git 命令**一律走 PowerShell 工具**，输出被吞时改成写文件再 Read。
- HTTPS push 失败（`cannot spawn sh`）→ 用 SSH：`git push git@github.com:harmsworth/English2.git main`，之后补 `git fetch origin`。
- `pnpm exec tsc -b` 偶发失败 → 用 `node node_modules/typescript/bin/tsc -b`；`pnpm build` 内部始终正常。

## UI 层契约（Phase 4D，`99b694f`）
- 路由：`/exams` 列表（`useExamPapers()`，year DESC）、`/exams/:paperId` 详情（**URL 用试卷 id，不用年份**），均在 `ProtectedRoute` 下。首页「查看历年真题」→ `navigate('/exams')`。
- 组件在 `src/components/exams/`：`PassageText`（长英文；中文参考放 `<details>`）、`ChoiceQuestion`（`letterOnly` 供新题型）、`TitlePool`（新题型标题池）、`TextQuestion`（翻译/写作兜底）、`ExamSection`（按真实 `type` 分派）、`json-utils.ts`（`readString/readBoolean/readStringArray` 运行时窄化 `extra_data`，**别用类型断言**）。
- **不变量：答案不上屏。** 不渲染 `correct_option` / `explanation`。⚠️ **翻译题 `passage_zh` 与小题 `extra_data.reference_translation` 内容同源 = 参考答案 → 翻译卡片必须整段隐藏 passage_zh**（其他题型才折叠展示）；Phase 4F-1 起服务层已不下发翻译题 `passage_zh`，前端按 `source_id.endsWith('-trans')` 兜底。写作 `sample`（仅 2024/2025）放进折叠。
- 去重：翻译 `section.passage` ≡ 唯一 text item 的 `content`；写作 `section.prompt`/`tips` ≡ text item 同名字段 → 归一化文本比对后**只渲染一次**。
- **禁止按 `sort_order` 推断题型**（跨年份不稳定）；真题型只有 阅读理解/完形填空/新题型/翻译/写作。小题数恒为 5/20/5/1/1。新题型 5 题共用同一份 `extra_data.titles`（**2010 仅 2 项 T/F，其余 7 项**）。
- `extra_data` 键位置：`titles`(新题型 section+item)、`chart`(写作 section / item)、`chart_url`(**仅 2013/2014 大作文**)、`sample`(2024/2025 写作)、`blank_no`(完形 item)、`reference_translation`(翻译 item)。⚠️ 源 JSON 里这些键在 **section 顶层**（`chart` 也是），`extra_data` 是同步后的 DB 侧容器名。

## F5：写作结构化 chart 渲染（Phase 4F-2，`1963370`）
- **`chart` 的真实三态（实测 17 年）**：① **对象** `{type,title,unit,items:[{label,value}]}` —— 全库**只有 2 处**：`zy-2024-write-b`(bar, %, 4 项)、`zy-2025-write-b`(bar, %, 5 项)；② **布尔 `true`**（各年 write-b，含 2026；2013/2014 的 write-s 为 `false`）；③ 缺失（部分 write-s）。`chart_url` **只有 2013 / 2014 大作文**。
- **解析**：`src/components/exams/json-utils.ts` 的 `readStructuredChart(source, key)` + 导出类型 `ChartItem` / `StructuredChart`。**只有 `items` 为非空数组且每项具 string `label` + 有限 number `value` 才认；否则返回 `null`**（布尔值也返回 null，交 `readBoolean` 走旧分支）；不抛错、零 `any`。
- **渲染**：`ExamSection.tsx` 三分支 `chart` → `chartUrl` → `chartFlag` → null。结构化图是纯 Tailwind 水平条形图（`figcaption`=标题 + 「柱状图 · 单位：%」，每行 label / 条宽 `value/max*100%` / `value+unit`），无任何 chart 库依赖。
- ⚠️ `json-utils.ts` 真实路径是 `src/components/exams/json-utils.ts`（不在 `src/lib/`）。
- 渲染细节：选项字母**优先沿用文本自带前缀**（2010→T/F、2026→A…G，2013 无前缀才按 index 生成）；题干自带 `41.` 式编号与 `item_no` 冲突时隐藏序号徽标、但用 `invisible` **保留列宽**；图表 `<img loading="lazy">` 外套 `min-h-48 bg-muted/40` 占位防塌缩。

## F7：题库错误文案归一化（Phase 4F-3，`36d72da`）
- `src/services/exams.ts` 导出 **`toExamErrorMessage(error: unknown): string`**，是**唯一**解读底层错误结构的地方。入参 `unknown`，只做类型守卫 + 可选字段读取，**零断言 / 零 `any` / 绝不抛出 / 绝不返回空串**。
- 分类（按优先级）：A 网络层 → `网络连接失败，请检查网络后重试。`；B 权限 → `当前无法访问题库，请重新登录后重试。`；C 不存在 → `试卷不存在`（**字面量保留、不带句号**）；D 服务端 5xx → `题库服务暂时不可用，请稍后重试。`；E 兜底 → `题库加载失败，请稍后重试。`
- 判据：A 靠文案（`failed to fetch` / `networkerror` / `network request failed` / `fetch failed` / `load failed`，含字符串入参）；B 靠 `status` 401/403 或 `code` 401/403/42501 或 `permission denied`/`row-level security`；C 靠 `status` 404 或 `code` pgrst116/404；D 靠 `status>=500` 或 `code∈PGRST000~003` 或 `code` 匹配 `/^5\d{4}$/`（SQLSTATE 5 类）或 5xx 措辞（`internal server error`/`bad gateway`/`service unavailable`/`gateway timeout`/`database error`）。
- **页面铁律**：`ExamListPage` / `ExamDetailPage` 的错误态只能写 `description={toExamErrorMessage(error)}`；**禁止**在页面里写 `error.code === …` / `error.message.includes(…)`。`LoginPage` 读 `error.message` 属 Auth 域，另论（Auth 侧对应物是 `auth.ts` 的 `toAuthErrorMessage`）。
- C 类只是**防御性兜底**：`maybeSingle()` 对 0 行返回 `data=null, error=null`，所以真实 404 走的是**页面 `data === null` 分支**，不经错误态。改这块时别把两条 404 路径合并。

## 验证技巧补充（4D 实测）
- dev server：`pnpm dev --port 5199 --strictPort`（后台运行）。⚠️ **只能用 `http://localhost:5199`，`127.0.0.1` 连不上**。登录页在 DEV 下已预填 `VITE_DEV_LOGIN_*`，直接点 `button[type="submit"]` 即可。
- ⚠️ 列表页本身也有 `main div[data-slot="card"]`，`waitForSelector` 会在未离场的列表 DOM 上立刻返回 → 断言详情页前必须 `waitForFunction(() => document.querySelectorAll('main div[data-slot="card"]').length >= 9)`。
- 答案泄露扫描**只扫题目卡片区域文本**（页头"答案与解析不在本页显示"这类说明会误报）；用 `span.bg-muted:visible` 判断序号徽标是否可见。
- `supabase-js` 的 `.in('item_id', <800+ 个 uuid>)` 会因 URL 过长静默失败 → 改为 `order('id').range(from, from+999)` 分页拉全量再本地 join。
- ⚠️ **抓 PostgREST response body 时别踩这个竞态**：`page.on('response', async (res) => { const t = await res.text(); rest.push(...) })` 是**先 await 再入队**，如果在 `networkidle` 之前就读取并清空数组，会漏掉刚发出的那条请求 → 后续断言级联误报。正确写法：**回调里同步入队，body 用 promise 携带**（`entry._p = res.text().then(t => entry.body = t)`），读取时 `await Promise.all(copy.map(e => e._p))`。并且断言前要 `waitForLoadState('networkidle')` + 短稳定期，详情页用 `waitForFunction(() => document.querySelectorAll(sel).length >= 9)` 而不是 `waitForSelector`。
- **验证「答案不发送」要看字节而不是 DOM**：直接把 response body 当字符串断言 `!raw.includes('correct_option')`，比解析 JSON 再看键更不容易漏（能覆盖 jsonb 内嵌字段）；再补一层对象键集合白名单校验。
- ⚠️ **但子串级扫描对 `explanation` 不可靠（4F-2 实测踩到）**：2013 某完形**选项正文**就是 `"sensible explanation"`，子串断言直接误报。→ **权威判据是「是否作为 JSON 键出现」**：递归收集 payload 全部对象键 + 键级正则 `"<name>"\s*:`；子串级只保留不可能出现在英文散文里的 snake_case 复合词（`correct_option` / `reference_translation` / `source_data` / `is_correct` / `"ans"`）。遇到「某年才 FAIL、别的年都过」的答案扫描失败，先怀疑题面/选项里的合法英文单词。

## 4F-3 起推荐的浏览器验证配置（比 4D 那套更省事）
- **用 Python Playwright，不要用临时目录装 Node Playwright**：托管 venv 里已装好 —— 解释器 `C:\Users\BSI\.workbuddy\binaries\python\envs\default\Scripts\python.exe`，`from playwright.sync_api import sync_playwright`，`pw.chromium.launch(headless=True)` 直接可用（浏览器已在 `%LOCALAPPDATA%\ms-playwright`）。
- dev server：`pnpm dev --port <port> --strictPort`（后台运行）；**只用 `http://localhost:<port>`，`127.0.0.1` 连不上**。登录走 UI 表单，凭据**运行时从 `.env.local` 读**（不要把密码写进脚本或仓库）。收尾记得停掉 dev server。
- **`maybeSingle()` 的 raw HTTP body 是单元素数组**（它走 `Accept: application/json`，客户端才展开成对象；只有 `single()` 才要 `vnd.pgrst.object+json`）。抓 body 断言必须 `body[0]`，否则误报「list has no get」。
- PowerShell 里 `python ... > file` 会被重新编码成乱码 → 结果统一由脚本自己 `json.dump(..., ensure_ascii=False)` 写 UTF-8 文件，再 Read 那个文件（或设 `$env:PYTHONIOENCODING="utf-8"`，但仍以 JSON 产物为准）。
- **`page.evaluate` 里跑 `eval` 的小坑**：对象字面量必须包一层括号 `eval('(' + expr + ')')`，否则 `{a:1}` 被解析成块语句 → `SyntaxError: Unexpected token ':'`；`eval_on_selector_all` 的回调**不能返回数字**（Playwright 内部会对结果 `len()` → `object of type 'int' has no len()`），一律返回数组、长度在 Python 侧算。
- 错误注入写法（F7 起验证错误态的标准姿势）：网络失败用 `page.route(glob, lambda r: r.abort())`；HTTP 状态码用 `route.fulfill(status=..., body=..., headers={...})`，**必须补 `access-control-allow-origin` 等 CORS 头，并对 `request.method == 'OPTIONS'` 预检单独 `fulfill(204)`**，否则跨域被 CORS 拦掉会伪装成网络错误（落到 A 类而不是 D 类）。React Query 默认 `retry: 3`（退避 1s/2s/4s ≈ 7s）→ 等错误态要给足超时。
- 控制台错误要**按阶段打标**（`PHASE` 全局变量 + `console` 监听里带 phase）再汇总，否则刻意注入的中断/500 会污染「正常流程 0 错误」的结论。
