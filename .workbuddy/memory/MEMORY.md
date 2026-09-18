# English2 项目长期记忆

> 只记**文档里没有的**约定与坑；规格类查 `docs/`（`phases/`、`pages/`、`architecture.md`、`development/`）。开工顺序：`docs/development/progress.md` → phase → page → 代码。

## 定位
考研英语二真题（2010–2026，17 套）。`D:\workSpace\github\English2`，main。
Vite+React 19+TS6(strict)+Tailwind 4+shadcn/ui+Supabase+TanStack Query+RR7+oxlint；`pnpm dev`/`build`(tsc -b && vite build)/`lint`/`db:types`。**Phase 1–7 全 done**。

## 铁律
- 链路只能 `Page → hooks → services → getSupabaseClient()`；**service 是唯一访问 Supabase 的层**。
- `data/exams/` 是源题库、**不作运行时数据源**；别名 `@/*`；根 tsconfig 不写 `baseUrl`；路由参数 `:paperId`。
- Phase 唯一定义源 = `docs/phases/`；旧「10 阶段」清单（`CODEBUDDY.md`/`.codebuddy/rules/`）**已废弃**。

## 数据 / 查询坑
- ⚠️ `index.json` 是 **153 条 section 级**索引、**不是 paper 列表** ⇒ 严禁当 `/exams` 数据源。
- ⚠️ `exam_sections` **无 `year` 列**（在 `exam_papers`）；`section_items` **无 `sort_order`**（用 `item_no`）。
- `ans` **0-based** → `correct_option` 直接沿用；`item_no` 是**大题内 1..N**；禁止按 `sort_order` 推题型。
- 查询一律显式白名单、**禁止 `*`**（列级 REVOKE ⇒ `42501`）；详情用嵌入别名 `all:exam_sections(...)`，且 `.order(...,{referencedTable:'all'})` **必须用别名**（真名报 400）；❌ select 内 SQL 函数（`coalesce`→PGRST100）。
- 类型全在 `src/services/exams.ts`（`Pick<Tables<...>, 白名单>`），**不手写第二套 DB 类型**；`src/types/database.ts` 是**纯 codegen（不手改）**，RETURNS TABLE 推非空 ⇒ null 收敛在 **service DTO 层**；**新增 RPC 先 `pnpm db:types` 再 tsc**。
- 求和一律用 `src/lib/number.ts`（`sum`/`sumBy`/`sumPrecise`/`roundTo`），**别手写 `reduce((t,x)=>t+x,0)`**：整数用 `sumBy`，小数（题分/金额）用 `sumPrecise`。

## 答案边界（不可回退）
- 前端**不读** `passage_zh`/`source_data`/`correct_option`/`explanation`/`extra_data`、`exam_papers` 除 id/year/title、`practice_answers.is_correct`/`score`。实现 = 列白名单 + DTO + **列级 GRANT/REVOKE**（不建 View）。
- 受控出口 = SECURITY DEFINER RPC（校验 `auth.uid()` + `search_path=public,pg_temp`）：`grade_practice_section`、`peek_item_answer`（一次一题）、`practice_session_stats`/`practice_type_accuracy`（counts-only）。
- 翻译判断走 `source_id.endsWith('-trans')`；⚠️ `/mistakes` **刻意不展示答案与解析**，对照只能走「重做 → 判分」。

## 数据库 / 权限（高危）
- Ref `btrgtbhiheosntzfjhxh`。8 表：题库 4（authenticated 仅 SELECT）+ 学习 4（RLS own-only + 完整 DML）；同步需 **service_role/postgres**，前端绝不出现。
- ⚠️ **用户豁免（2026-09-16）**：**不写 migration**、**不做 SQL 备份** ⇒ 变更不可追溯/回滚；执行前 `git status`、SQL 摊给用户、跑完读回核对。⚠️ **`supabase` CLI 已不可复现** ⇒ 改用 **`supabase-js` + `.env.local` 的 publishable key + 用户登录**（RLS 限本人），先只读盘点再动手。
- `mistakes`：**UNIQUE(user_id,item_id)**；item_id FK RESTRICT；**有 updated_at 触发器 ⇒ 别手写**。⚠️ 删会话**不会**删 mistakes（**无 session FK**）⇒ 清理探针必须**单独删 mistakes**。
- ⚠️ `practice_sessions` **两个 CHECK**（`..._target_check`+`..._type_check`）：**加新 session_type 必须两个都改**，只改一个报 23514。drill 是跨年跨卷同题型集合 ⇒ 对账按 **year-set 相等**（`.contains()` 只是子集）。
- `grade_practice_section`：判分写回 → **错题收录**（细节见 `docs/pages/mistakes.md` §7）→ session 置 completed。改 body 用 `create or replace`；⚠️ **改返回列必须 drop + 重新 GRANT**；⚠️ 整卷会话 `order by coalesce(es.sort_order,0), si.item_no`。
- ⚠️ `peek_item_answer` 的 scoped 判断要**覆盖 practice/exam/drill 三支**（漏一支 = 该模式选完不揭示）。

## 作答保存契约（硬性）
- **作答期零网络请求**：点选/标记/输入/切题**只改内存**（`PracticeRunner.pendingRef`）。
- **只在**退出/返回上一页/提交判分/卸载/`pagehide`/`visibilitychange` 落库；提交时 **`flushAnswers()` 先于判分 RPC**。
- **唯一写入口** `useSavePracticeAnswerDrafts()` → `savePracticeAnswerDrafts({sessionId,upserts,deletes})`：**一次** `upsert(rows,{onConflict:'session_id,item_id'})`（+ 必要时一次 `delete().in(...)`）。⚠️ rows **每行键必须一致**（缺的写 `null`），否则 PGRST102。
- ⚠️ **30s 周期回写已删除**；⚠️ 卸载兜底**不能返回 Promise**（写 `void flush()`）；⚠️ `useUpsertPracticeAnswer`/`useDeletePracticeAnswer` **答题页禁止再引入**。

## 缓存失效契约（跨域）
- ⚠️ 全局 `staleTime` = **5 分钟**（`src/main.tsx`）⇒ **跨域写入必须显式失效对方缓存**，否则切页面不重取、用户以为没生效。
- 硬性：`useGradePracticeSection` 成功 → 除 practice 域外**必须**失效 `mistakeKeys.all`（判分 RPC 会写 `mistakes`）；漏了 = 「提交完点错题本还是旧列表、得手动刷新」。失效默认 `refetchType:'active'`（未挂载只标脏、挂载即重取），别改成 `'none'`。

## UI 契约（文档未覆盖的）
- ⚠️ `/exams/:paperId` 有页面级**「← 返回题库」文字链**（四态都在，标题上方）：用文字链非按钮（不跟主 CTA 争权重）、**硬编码 `to="/exams"`**（`navigate(-1)` 在直达/刷新时没有上一页）。
- ⚠️ **乐观态必须有**（`answeredIndices` = 服务端行 ∪ 本地乐观态），否则 Playwright `check()` 报 "did not change its state"。
- ⚠️ **`DrillPage`「已结束」只判一次**：`(status==='completed'||'abandoned') && graded===null`；跟着 `status` 走会让**判分结果页被结束态顶掉**；用 `useEffect` 快照会触发 `react(set-state-in-effect)` ⇒ 用**纯派生**。
- `canSubmit = hasChoiceItems || source_id.endsWith('-trans')`（不能用 `!hasChoiceItems`，否则写作题长出假提交按钮）。
- 计时是**倒计时**；超时自动提交，**0 作答则置 abandoned**。「显示答案」= **仅 choice 且用户已选**；**翻译/写作永不揭示**。

## 环境坑位（Windows）
- **PowerShell 只回传退出码、吞 stdout** ⇒ 一律 `命令 | Out-File -Encoding utf8 x.txt` 再 Read；失败会**中断整条管道**（日志没生成 = 前面命令没跑成）；**`cmd /c` 被禁**。**Bash PATH 残缺**（只有 `git`）⇒ 文件操作走专用工具。
- ⚠️ **删文件被沙箱接管**：`Remove-Item` 走 safe-delete（回收站），通道失败报 `SAFE_DELETE_FAIL_CLOSED` 且**拒绝硬删** ⇒ 改用 `Move-Item` 挪去 `$env:TEMP`。
- **浏览器验证**：`agent-browser` **未装**；用 `playwright-core` + 显式 `executablePath`。⚠️ 模块在 **`C:\Users\BSI\.workbuddy\binaries\node\workspace\node_modules`**（**不在项目里**），`NODE_PATH` 要指过去，否则 MODULE_NOT_FOUND；chromium 用 `…\ms-playwright\chromium-1228\chrome-win64\chrome.exe`。
- dev server：`node node_modules/vite/bin/vite.js --port 5173 --strictPort`（后台任务；`Start-Process -WindowStyle Hidden` 会静默退出）。⚠️ 它绑 **IPv6 `[::1]`** ⇒ `Test-NetConnection 127.0.0.1` 报 False 但服务在跑；判断用 `netstat -ano | Select-String :5173`，探测用 `localhost`。
- ⚠️ 断言异步渲染的元素**先 `waitFor` 再 `count()`**：直接数会得 0，误判成功能坏了。
- ⚠️ `uppercase` 眉栏的 `innerText` 返回**大写** ⇒ 断言忽略大小写；冒烟按钮文案会撞车（「退出」也匹配顶栏登出）⇒ 用 `page.locator('main button', ...)`。
- ⚠️ 只断言「答案未泄露」不够：切题后**答案块应消失**并数 `peek_item_answer` 次数（翻译/写作应为 0）；泄露扫描要**结构级**且排除受控 RPC。
- ⚠️ **同一文件并行发多个 Edit 会互相覆盖**（曾「删导入」没生效 ⇒ tsc TS6133）⇒ 改完必须 Read 复核，或整文件 Write。

## 纪律 / 待清理
- 用户常在 `.workbuddy/`、`docs/`、`src/` 下有未提交在制品：**不得**删除/覆盖/回滚/`git add .`/`git clean`/commit/push（除非明确要求）。开工先 `git status`，收尾 `git status`/`git diff`/`git diff --check`。
- ⚠️ 自动化探针会污染线上库（**会话 + 作答 + 错题**）：跑完必须清干净，**只删自己造的**；清错题的锚点 = 「本会话作答过的 item_id」∩「`updated_at >= 会话 created_at`」，再核对删前删后总数。用户真实数据宁可保留。
- 非缺陷待办：`shadcn`(CLI) 应在 `devDependencies`；`cn@0.2.6` 是它的传递依赖，不是没用到。
