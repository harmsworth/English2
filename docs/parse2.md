# English2 Phase 2 — Supabase Database Types & Data Layer Foundation

## 0. 任务

现在开始实现 English2 项目的：

**Phase 2 — Supabase Database Types & Data Layer Foundation**

GitHub repository：

https://github.com/harmsworth/English2

当前分支：

`main`

Phase 1 已完成并已提交。

**本次只允许完成 Phase 2。**

Phase 2 的核心目标：

> 将已经存在的 Supabase PostgreSQL 数据库，正式、准确地接入 TypeScript，并建立 `Database → Typed Supabase Client → Service → TanStack Query Hook` 的基础数据层。

完成后立即停止，**不得进入 Phase 3 Authentication。**

---

# 1. 第一原则：先检查，禁止猜测

开始修改任何代码之前，先检查实际仓库。

至少检查：

```text
package.json
pnpm-lock.yaml
README.md
components.json
.oxlintrc.json
tsconfig.json
tsconfig.app.json
vite.config.ts

src/main.tsx
src/App.tsx
src/router/index.tsx
src/lib/constants.ts
src/lib/utils.ts
src/services/supabase.ts

data/exams/
docs/database-schema.md

supabase/
supabase/migrations/
```

同时执行：

```bash
git status
git branch --show-current
git log --oneline -5
```

确认：

1. 当前是否为 `main`
2. 工作区是否干净
3. Phase 1 实际代码状态
4. package.json 中真实依赖
5. 当前 Supabase client 实现
6. 当前 TanStack Query 是否已经初始化
7. `docs/database-schema.md` 是否存在
8. `supabase/` / `supabase/migrations/` 是否存在

**不要假设仓库结构。**

以实际仓库为准。

---

# 2. `.env.local` 已经存在，严格保护真实配置

当前本地 `.env.local` 已经包含以下 4 个真实值：

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=

VITE_DEV_LOGIN_EMAIL=
VITE_DEV_LOGIN_PASSWORD=
```

这些值已经存在于本地环境。

## 重要安全规则

可以读取：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

用于 Supabase CLI / 本地开发验证。

但是：

**绝对禁止把 `.env.local` 的真实值写入：**

```text
src/
README.md
docs/
package.json
任何 .ts / .tsx 文件
git commit
git diff
终端最终报告
日志
截图
测试文件
```

尤其禁止输出真实：

```text
VITE_DEV_LOGIN_EMAIL
VITE_DEV_LOGIN_PASSWORD
```

也禁止输出任何：

```text
service_role key
database password
secret key
access token
refresh token
```

如果需要在报告中说明环境变量，只能写：

```text
.env.local 已配置
```

不能显示具体值。

---

# 3. `.env.local` 中的 DEV_LOGIN 字段本 Phase 禁止使用

虽然当前 `.env.local` 已经存在：

```env
VITE_DEV_LOGIN_EMAIL=
VITE_DEV_LOGIN_PASSWORD=
```

但这两个变量属于未来 Authentication / 开发测试登录。

**Phase 2 不得：**

```text
自动登录
登录测试
创建 AuthProvider
读取 DEV_LOGIN_EMAIL
读取 DEV_LOGIN_PASSWORD
实现 Login
实现 Logout
实现 Session
```

本 Phase 只使用 Supabase URL / Publishable Key 来建立数据库客户端和生成类型。

---

# 4. 本 Phase 的架构目标

最终形成：

```text
Supabase PostgreSQL
        ↓
npx supabase gen types typescript
        ↓
src/types/database.ts
        ↓
SupabaseClient<Database>
        ↓
src/services/exams.ts
        ↓
TanStack Query Hooks
        ↓
Future Pages
```

严格保持：

```text
Page
 ↓
Hook
 ↓
Service
 ↓
Supabase
```

禁止：

```text
Page
 ↓
supabase.from(...)
```

---

# 5. 数据库 Source of Truth

数据库真实 Schema 是最高优先级。

优先级：

```text
实际 Supabase PostgreSQL
        >
Supabase CLI 生成结果
        >
docs/database-schema.md
        >
README.md
        >
代码推测
```

`docs/database-schema.md` 是数据库结构文档，用于：

1. 理解数据库
2. 人工核对生成结果
3. 帮助后续开发

但：

**禁止根据 `docs/database-schema.md` 手工编写正式 `Database` 类型。**

---

# 6. 必须使用 Supabase CLI 生成 TypeScript Database Types

这是本 Phase 的硬性要求。

先检查：

```bash
npx supabase --version
```

不要使用其他 ORM 的 schema generator。

必须优先使用：

```bash
npx supabase gen types typescript
```

从真实 Supabase PostgreSQL Schema 生成：

```text
src/types/database.ts
```

---

# 7. Supabase CLI 的执行方式

先检查当前项目是否已经：

```text
supabase init
```

以及是否已经 link 到远程项目。

检查：

```bash
npx supabase status
```

以及必要的 CLI 帮助：

```bash
npx supabase gen types typescript --help
```

如果当前项目已经 link：

优先使用官方的 linked database 类型生成方式。

如果没有 link：

先判断当前环境是否能够安全地使用当前项目的 Project ID 连接远程 Supabase。

**不要猜 Project ID。**

可以从当前已有的：

```text
VITE_SUPABASE_URL
```

或 Supabase CLI 配置中确认 Project ID。

---

# 8. `database.ts` 必须是生成文件

目标：

```text
src/types/database.ts
```

必须来自：

```bash
npx supabase gen types typescript
```

生成结果。

禁止：

```text
WorkBuddy 根据 Markdown 手写 Database 类型
WorkBuddy 根据记忆猜字段
WorkBuddy 根据业务逻辑补字段
```

如果生成结果与 `docs/database-schema.md` 不一致：

**不要自行修改 `database.ts` 来“对齐文档”。**

应该：

1. 检查真实数据库
2. 检查 schema 文档
3. 检查生成命令
4. 判断差异来源
5. 在最终报告明确说明

---

# 9. `database.ts` 至少应该覆盖什么

实际生成结果应该来自真实数据库。

检查生成结果至少包含：

## Tables

```text
exam_papers
exam_sections
section_items
item_options

practice_sessions
practice_answers

mistakes
mistake_reviews
```

## Functions

至少检查：

```text
sync_exam_paper
```

以及数据库实际存在的其他 public functions。

## 其他数据库类型

如果实际数据库中存在：

```text
Enums
Composite Types
Views
Functions
Relationships
```

应该以 Supabase CLI 实际生成结果为准。

**不要因为当前 Phase 不使用，就手工删除 CLI 生成的数据库类型。**

---

# 10. 不要手工“美化”生成文件

如果 `database.ts` 是 CLI 生成的：

不要为了代码风格：

```text
重新排列所有类型
删除生成内容
手工重写字段
修改数据库类型
添加业务字段
```

允许添加非常简短的 generated-file 注释，但：

**优先保持 Supabase CLI 原始生成结构。**

不要声称：

```text
Generated
```

却实际上是手写。

---

# 11. JSON / jsonb

以 Supabase CLI 实际生成的 JSON 类型为准。

如果生成结果使用：

```ts
Json
```

则直接使用生成结果。

不要另外创建第二套 JSON 类型。

禁止：

```ts
any
```

禁止：

```ts
as any
```

禁止：

```ts
@ts-ignore
```

---

# 12. Row / Insert / Update

Supabase CLI 生成的 Database 类型应该自然包含：

```text
Row
Insert
Update
```

例如：

```text
Database
└── public
    └── Tables
        └── exam_papers
            ├── Row
            ├── Insert
            └── Update
```

**不要自己重复定义第二套 Table 类型。**

不要创建：

```text
ExamPaperRow
ExamPaperInsert
ExamPaperUpdate
```

除非后续实际业务确实需要。

Phase 2 暂时不要增加这种重复抽象。

---

# 13. Typed Supabase Client

检查：

```text
src/services/supabase.ts
```

当前项目已经使用 lazy singleton：

```ts
getSupabaseClient()
```

保留现有架构。

只把它类型化。

目标：

```ts
createClient<Database>(
  supabaseUrl,
  supabasePublishableKey,
)
```

最终：

```ts
getSupabaseClient()
```

返回：

```ts
SupabaseClient<Database>
```

而不是：

```ts
SupabaseClient
```

不要把 lazy singleton 改成另一套架构。

不要创建第二个 Supabase client。

---

# 14. Service Layer

建立：

```text
src/services/exams.ts
```

职责：

> 只负责题库相关的数据库访问。

本 Phase 只实现真正需要的最小读取 API。

至少考虑：

```text
getCurrentExamPapers()
getExamPaperById()
```

但必须先检查：

```text
实际数据库关系
现有 query keys
现有项目结构
```

不要为了“完整”而创建大量未来 API。

---

# 15. `exam_papers` 查询

正常列表查询应该只读取：

```text
is_current = true
```

历史版本默认不作为当前题库列表。

排序：

```text
year DESC
```

如果实际项目已有其他明确约定，则保持已有约定。

不要自行改变数据库。

---

# 16. 题库详情查询

`getExamPaperById()` 必须基于实际数据库结构实现。

先检查：

```text
exam_papers
exam_sections
section_items
item_options
```

之间的真实关系。

不要猜 relation 名称。

如果需要嵌套查询：

必须根据 Supabase 实际 schema / generated types 验证。

不要为了让 TypeScript 通过而使用：

```ts
as any
```

---

# 17. Query Keys

检查：

```text
src/lib/constants.ts
```

当前已经存在：

```ts
examKeys
```

继续使用现有：

```ts
examKeys.all
examKeys.lists()
examKeys.detail(paperId)
```

不要重新创建：

```text
examQueryKeys
questionKeys
paperQueryKeys
```

之类的第二套 key。

如果现有 key 需要最小扩展，可以扩展。

不要大规模重构。

---

# 18. TanStack Query Hooks

建立：

```text
src/hooks/use-exam-papers.ts
src/hooks/use-exam-paper.ts
```

实现：

```text
useExamPapers()
useExamPaper(paperId)
```

原则：

```text
Hook
 ↓
Service
 ↓
Supabase
```

Hook 不应该直接：

```ts
supabase.from(...)
```

---

# 19. Query Key 使用规则

```text
useExamPapers()
```

使用：

```ts
examKeys.lists()
```

```text
useExamPaper(paperId)
```

使用：

```ts
examKeys.detail(paperId)
```

未来可以：

```ts
queryClient.invalidateQueries({
  queryKey: examKeys.all,
})
```

不要重新设计 query key。

---

# 20. 检查 React Query Provider

Phase 1 已经安装：

```text
@tanstack/react-query
```

因此检查当前：

```text
src/main.tsx
src/App.tsx
```

是否已经建立：

```text
QueryClient
QueryClientProvider
```

如果尚未建立：

**只做 TanStack Query 正常运行所必需的最小 Provider 配置。**

不要增加：

```text
复杂缓存策略
持久化
offline
IndexedDB
devtools
全局错误系统
```

如果已经存在，则保持现状。

---

# 21. 不要创建 Domain Types

本 Phase 暂时不要创建：

```text
src/types/exam.ts
src/types/practice.ts
src/types/mistake.ts
```

不要提前创建：

```text
Exam
ExamSection
Question
Option
PracticeSession
PracticeAnswer
Mistake
MistakeReview
```

数据库类型：

```text
src/types/database.ts
```

暂时作为唯一数据库类型来源。

等未来 UI / 业务真正需要 View Model 时再建立 Domain Model。

---

# 22. RPC

数据库已经存在：

```text
sync_exam_paper(...)
```

本 Phase：

**只要求它出现在 Supabase CLI 生成的 `Database.Functions` 类型中。**

不要实现：

```text
syncExamPaper()
```

不要实现：

```text
GitHub → SHA-256 → RPC
```

不要实现同步 UI。

---

# 23. Authentication

本 Phase 完全不实现：

```text
Login
Logout
Register
AuthProvider
AuthGuard
Session UI
User management
```

即使：

```text
VITE_DEV_LOGIN_EMAIL
VITE_DEV_LOGIN_PASSWORD
```

已经存在，也禁止使用。

认证属于 Phase 3。

---

# 24. RLS

绝对不要修改：

```text
RLS
Policy
Grant
RPC permission
```

禁止：

```text
disable RLS
grant anon
绕过 RLS
```

不要为了测试数据库读取而修改安全策略。

如果真实查询因为：

```text
authenticated
```

要求登录而无法验证：

**不要修改 RLS。**

在最终报告说明：

```text
RLS requires an authenticated user.
Authentication is intentionally deferred to Phase 3.
```

---

# 25. Security

绝对禁止把以下内容进入代码：

```text
service_role key
database password
Supabase secret key
access token
refresh token
真实登录密码
```

`.env.local` 不得提交。

确认：

```bash
git status
```

不会看到：

```text
.env.local
```

如果 `.gitignore` 不正确，修复 `.gitignore`。

但不要提交 `.env.local`。

---

# 26. Migration：本 Phase 不强制建立

先检查：

```text
supabase/
supabase/migrations/
```

如果已经存在 migration：

先检查，不要破坏。

如果不存在：

**不要根据 `docs/database-schema.md` 手写一套 migration。**

也不要为了“完整”而重新创建数据库。

只有在能够通过 Supabase CLI 安全、准确地获取当前远程数据库 schema，并且不会修改线上数据库的情况下，才考虑建立 schema/migration 记录。

否则：

**本 Phase 不建立 migration。**

最终报告明确：

```text
Migration: not established in Phase 2
Reason: existing remote database has not yet been safely brought under migration management.
```

不要制造未经验证的 migration。

---

# 27. `docs/database-schema.md`

如果存在：

```text
docs/database-schema.md
```

必须阅读。

生成 `database.ts` 后，用它与实际文档进行人工核对。

特别检查：

```text
8 tables
Foreign Keys
Functions
JSONB
nullable fields
default fields
RLS-related expectations
```

但：

**不要因为文档与 CLI 生成结果存在差异，就直接修改数据库或手改 generated types。**

最终报告说明差异。

如果文档不存在：

不要仅仅为了完成 Phase 2 而根据猜测创建文档。

---

# 28. `cn` package

不要顺手清理。

检查：

```bash
pnpm why cn
```

以及：

```text
from 'cn'
```

是否实际存在。

本 Phase：

**不要删除 `cn` package。**

也不要因为 shadcn 新版本的默认方式而改变项目当前：

```text
src/lib/utils.ts
```

中的：

```text
clsx + tailwind-merge
```

约定。

`cn` cleanup 属于独立任务。

---

# 29. 依赖原则

只使用：

```text
pnpm
```

不要使用：

```text
npm
yarn
bun
```

不要安装：

```text
Prisma
Drizzle
Axios
Redux
Zustand
ORM
React Query replacement
```

如果 `@supabase/supabase-js`、TanStack Query 等现有依赖已经满足需求：

**不要重复安装。**

Supabase CLI 如果只是用于开发期 `gen types`：

优先使用：

```bash
npx supabase ...
```

不要为了运行一次类型生成而擅自把 CLI 加入生产依赖。

---

# 30. 不需要生成的东西

本 Phase 不要生成以下内容：

```text
OpenAPI
Swagger
Apifox definitions
API client
Axios client
Domain model
DTO layer
ORM model
Migration（除非安全可验证）
Auth types
Login service
Practice service
Mistake service
Exam service for submission
```

核心是：

```text
Database Types
+
Typed Client
+
Exam Read Service
+
React Query Hooks
```

---

# 31. 最小开发验证

如果需要验证 Data Layer：

可以对现有 HomePage 做极小的开发验证。

例如：

```text
Supabase configured
Current exam papers: ...
```

但：

**不要开始制作正式 HomePage。**

如果因为没有 authenticated session 无法读取真实数据：

不要修改 RLS。

可以验证：

```text
TypeScript
Build
Lint
Hook compilation
Service typing
```

---

# 32. 不允许 Mock 数据

禁止：

```text
mock exam_papers
fake Supabase response
hardcoded question list
```

不要把：

```text
data/exams/papers-2010.json
```

import 到页面中冒充 Runtime Database。

`data/exams` 仍然是：

```text
GitHub Source of Truth
```

Supabase 是：

```text
Runtime Database
```

---

# 33. TypeScript 检查

必须保持：

```text
strict: true
```

禁止：

```ts
any
```

禁止：

```ts
as any
```

禁止：

```ts
@ts-ignore
```

禁止通过降低 TypeScript 配置来解决错误。

---

# 34. 预期文件

正常情况下，Phase 2 最少应该涉及：

```text
src/
├── hooks/
│   ├── use-exam-paper.ts
│   └── use-exam-papers.ts
│
├── services/
│   ├── supabase.ts
│   └── exams.ts
│
└── types/
    └── database.ts
```

以及根据实际情况可能修改：

```text
src/main.tsx
src/App.tsx
src/lib/constants.ts
.gitignore
```

**不要为了结构好看创建大量空目录。**

---

# 35. 必须执行的验证

完成后必须执行：

```bash
pnpm lint
pnpm build
pnpm exec tsc -b
```

同时：

```bash
git status
git diff --stat
git diff
```

检查：

1. 没有 `.env.local` 被加入 Git
2. 没有真实密码出现在 diff
3. 没有 secret 出现在代码
4. 没有数据库 schema 被修改
5. 没有 RLS 被修改
6. 没有无关依赖变化
7. 没有 Phase 3 功能

---

# 36. Git 要求

Phase 2 完成并验证通过后：

```bash
git status
```

确认没有敏感文件。

然后：

```bash
git add ...
git commit -m "feat: add typed Supabase data layer"
git push origin main
```

**只提交 Phase 2 相关修改。**

如果存在与 Phase 2 无关的本地修改：

不要覆盖。

不要删除。

不要强制 reset。

在最终报告中说明。

---

# 37. 成功标准

只有满足以下条件才算 Phase 2 完成。

## A. Database Types

存在：

```text
src/types/database.ts
```

并且：

**它由 `npx supabase gen types typescript` 从真实 Supabase schema 生成。**

至少确认存在：

```text
8 tables
sync_exam_paper function
Row / Insert / Update
JSON / jsonb types
```

以及 CLI 实际生成的其他数据库对象。

---

## B. Typed Supabase Client

：

```text
src/services/supabase.ts
```

使用：

```text
SupabaseClient<Database>
```

并保持现有 lazy singleton。

---

## C. Exam Service

存在：

```text
src/services/exams.ts
```

至少提供：

```text
getCurrentExamPapers()
getExamPaperById()
```

前提是实际 schema 支持。

---

## D. Query Hooks

存在：

```text
useExamPapers()
useExamPaper()
```

并使用：

```text
examKeys
```

---

## E. Query Provider

如果 Phase 1 尚未配置 TanStack Query：

完成最小：

```text
QueryClient
QueryClientProvider
```

否则保持现状。

---

## F. Architecture

必须保持：

```text
Page
 ↓
Hook
 ↓
Service
 ↓
Supabase
```

页面禁止：

```ts
supabase.from(...)
```

---

## G. Security

必须：

```text
RLS unchanged
Policies unchanged
No service_role
No database password
No real password in source
.env.local not committed
```

---

## H. Database

除非为了建立已经真实验证的 migration 记录：

**线上 Supabase PostgreSQL schema 不得发生变化。**

---

## I. Validation

必须：

```text
pnpm lint
pnpm build
pnpm exec tsc -b
```

成功。

---

# 38. 最终报告格式

完成后严格按照以下格式报告：

## 1. Phase 2 完成情况

```text
[完成] Supabase CLI type generation
[完成] src/types/database.ts
[完成] typed Supabase client
[完成] exam service
[完成] TanStack Query hooks
[完成/未完成] QueryClientProvider
[完成/未完成] migration
[完成/未完成] schema documentation verification
```

---

## 2. Type Generation

明确说明：

```text
Type generation command:
npx supabase gen types typescript ...
```

并说明：

```text
Types generated from remote Supabase schema: 是/否
```

如果不是：

明确解释原因。

**不要只说“生成成功”。**

---

## 3. 修改文件

完整列出：

```text
新增：
...

修改：
...

删除：
...
```

没有删除时：

```text
删除：无
```

---

## 4. Database Changes

明确：

```text
Supabase PostgreSQL schema 是否发生变化：是/否
```

正常情况下应该：

```text
否
```

并明确：

```text
本 Phase 未修改线上数据库结构。
```

---

## 5. Dependency Changes

明确：

```text
新增：
...

删除：
...

升级：
...
```

没有：

```text
无
```

---

## 6. Security Check

明确：

```text
.env.local 是否提交：否
真实密码是否进入代码：否
service_role 是否使用：否
database password 是否使用：否
RLS 是否修改：否
Policy 是否修改：否
```

**不要在报告中打印任何真实环境变量值。**

---

## 7. Validation

完整报告：

```text
pnpm lint
pnpm build
pnpm exec tsc -b
```

包括：

```text
exit code
errors
warnings
```

不要只写：

```text
通过
```

---

## 8. Git

报告：

```text
commit hash:
push result:
working tree:
```

确认 Phase 2 已提交并 push 到：

```text
main
```

---

## 9. 未解决问题

如果存在：

```text
Supabase CLI 无法连接
Schema mismatch
RLS 无法真实验证
Migration 未建立
其他 BLOCKED
```

必须明确写出。

不要隐藏问题。

---

# 39. 最终铁律

**本次只做 Phase 2：Supabase Database Types + Data Layer Foundation。**

必须优先使用：

```text
npx supabase gen types typescript
```

从真实 Supabase PostgreSQL 生成：

```text
src/types/database.ts
```

然后建立：

```text
Typed Supabase Client
        ↓
Exam Service
        ↓
TanStack Query Hooks
```

不要手写猜测数据库类型。

不要实现 Login。

不要实现 Logout。

不要实现 Register。

不要实现 AuthProvider。

不要实现题库同步。

不要实现 GitHub → SHA-256 → RPC。

不要实现 Practice。

不要实现 Mistakes。

不要实现 Exam。

不要实现 Statistics。

不要实现 PWA。

不要实现 Offline。

不要修改数据库设计。

不要修改 RLS。

不要修改 Policy。

不要暴露任何 secret。

不要提交 `.env.local`。

不要使用 `VITE_DEV_LOGIN_EMAIL` / `VITE_DEV_LOGIN_PASSWORD`。

不要删除 `cn` package。

不要清理无关依赖。

不要进入 Phase 3。

**完成 Phase 2、commit、push，然后立即停止，等待下一阶段指令。**
