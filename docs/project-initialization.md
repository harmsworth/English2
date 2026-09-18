# 项目初始化与设计决策（Project Initialization）

> 目标：说明 English2 在**项目初始化阶段**（README Phase 1）做了什么、**技术栈为什么这样选**、以及**设计和写代码时必须遵守的约束**。
> 本篇回答「为什么这样搭 / 设计时要考虑什么」；「怎么把项目跑起来」见 [`getting-started.md`](./getting-started.md)。
> 机器可读的硬约束以 [`.codebuddy/CODEBUDDY.md`](../.codebuddy/CODEBUDDY.md) 与 [`.codebuddy/rules/*`](../.codebuddy/rules/) 为准，本篇是它的可读化汇总；能力现状与 Roadmap 见根 [`README.md`](../README.md)。

---

## 1. 初始化交付了什么

Phase 1「项目初始化」的产物，就是让后续每个 Phase 能在**同一套约束**下增量开发的骨架：

- 技术栈选型与脚手架（React + Vite + TS + Tailwind 4 + shadcn/Base UI + Supabase，见 §2）。
- 分层骨架与依赖注入约定（`services/ → hooks/ → pages/`，见 §3）。
- 目录结构与「随阶段建立、不预先建空目录」原则（见 §4）。
- 数据事实来源层级与答案隔离边界（见 §5）。
- 严格 TypeScript、路径别名、TS6 构建决策（见 §6、§7）。
- 开发纪律：Phase 推进、Build Gate、Git、Shell 失败即停、结果不伪造（见 §8）。

> 这些**不是一次性写完就不动**的文档，而是每次改动都要对照的红线。

---

## 2. 技术栈选型（及不可随意替换的约束）

| 领域 | 选型 | 关键理由 / 约束 |
| --- | --- | --- |
| 框架 | React 19 + TypeScript | 组件化 + 严格类型；`strict` 全开 |
| 构建 | Vite 8 + `@vitejs/plugin-react` | 快、`tsc -b` 只做类型、产物由 vite 打 |
| 样式 | Tailwind CSS 4（`@tailwindcss/vite`） | **CSS-first，无 `tailwind.config.js`**；主题变量写在 `src/index.css` |
| UI | shadcn/ui，primitive 用 **Base UI**（`@base-ui/react`） | `components.json`：style `base-nova`、base `neutral`、`iconLibrary: lucide`；**不使用 Radix** |
| 路由 | React Router 7（`createBrowserRouter`） | 页面组件**路由级 `React.lazy` 懒加载** |
| 数据 | Supabase（`@supabase/supabase-js`）+ TanStack Query 5 | 库=运行时唯一读取源；缓存/请求状态只在 Hook 层 |
| 表单 | React Hook Form + Zod | 校验 schema 与类型推导统一 |
| 工具 | clsx / tailwind-merge / CVA / date-fns | `cn()` 收口在 `src/lib/utils.ts` |
| 包管理 | **只用 pnpm** | 不混用 npm/yarn，避免第二份 lockfile |

**约束**：除非用户明确要求，不擅自更换核心技术栈；不因「网上示例写法不同」而偏离以上选型（复用现有 client / QueryClient / router / `examKeys` / `cn()` / shadcn 组件）。

**两个容易踩的初始化决策**：

- **TS6 废弃 `baseUrl`**：`@` 别名只在 `tsconfig.json` / `tsconfig.app.json` 写 `paths: {"@/*":["./src/*"]}`，**不写 `baseUrl`**；同时 `vite.config.ts` 用 `fileURLToPath(new URL('./src', import.meta.url))` 配 `resolve.alias`。两处必须一致。
- **Tailwind 4 无 config 文件**：主题、`@theme`、shadcn CSS 变量都在 `src/index.css`，别去找 `tailwind.config.js`。

---

## 3. 分层架构（单向数据链，禁止越层）

```text
Page  →  Hook  →  Service  →  Supabase
```

各层职责与硬边界：

- **Service（`src/services/`）**：唯一允许 import Supabase client、访问数据库的层；负责表/视图查询、`rpc` 调用、结果映射、错误归一化。导出纯函数，**不得出现 `useQuery` / `useMutation`**。
- **Hook（`src/hooks/`）**：唯一使用 TanStack Query 的层；调用 Service，不直接碰 Supabase；`queryKey` 统一走 `src/lib/constants.ts` 的 `examKeys` / `practiceKeys` / `mistakeKeys`。
- **Page / Component（`src/pages/`）**：只消费 Hook 的数据与状态，负责布局与交互。

**硬性禁止**（Page/Component 里）：

```ts
supabase.from(...)   supabase.rpc(...)   supabase.auth.*
```

也不允许在 Page 内联写查询逻辑、错误重试、loading 状态机。`src/services/supabase.ts` 提供懒加载单例 `getSupabaseClient()`，前端只持 publishable key。

---

## 4. 目录结构与建立原则

初始化只搭必要的骨架，其余**随 Phase 逐步建立**（规则明文：不为「目录好看」提前创建空目录）。当前形态：

```text
src/
  components/        通用组件 + shadcn/ui（Base UI）+ exams/ practice/ 领域组件
  hooks/             React Query hooks（唯一用 TanStack 的层）
  lib/               constants.ts（queryKey 工厂） / utils.ts（cn）
  pages/             路由页面（懒加载入口）
  providers/         auth-context / auth-provider
  router/            createBrowserRouter + 路由级 React.lazy
  services/          supabase / exams / practice / auth（唯一访问库的层）
  types/database.ts  由真实 Supabase schema 生成（勿手写）
  App.tsx / main.tsx / index.css
```

---

## 5. 数据事实来源层级与答案隔离（安全边界）

这是本项目**最容易在重构中被误伤**的部分（设计稿重做 UI 时必须保留）。三层事实来源：

```text
GitHub data/exams/*.json  →  Source of Truth（题库内容源头，人工维护 + git push）
Supabase PostgreSQL       →  Runtime（运行时唯一读取源）
React Client              →  Client（只读题库；不写题库四表）
```

**答案隔离设计**（详情页只读题面，答案/解析永不下发浏览器）：

- `correct_option`、`explanation`、`source_data`、翻译题 `passage_zh` 等敏感列：Service 用**显式列白名单 + 逐字段重建 DTO**，且数据库侧用**列级 GRANT/REVOKE** 把这些列移出前端可读集合。
- 为什么必须列级：**RLS 只管行、不限列**，仅靠表级 SELECT 会被绕开，答案边界只能靠列级权限收口。
- 判分：客观题由服务端 **`SECURITY DEFINER` RPC** 判分，浏览器不拿到正确答案去「本地判」。
- 前端**不持有** `service_role` key；题库写入受控于 `service_role` / 后台同步（`sync_exam_paper`，SHA-256 指纹幂等）。

**用户行为数据**（`practice_sessions` / `practice_answers` / `mistakes` / `mistake_reviews`）由前端写入，受 RLS 归属当前登录用户。

安全红线（`security.md`）：前端代码 / 构建产物 / Git / 日志 / 聊天 / 截图中**绝不出现** service_role key、数据库密码、secret/private key、access/refresh token；只允许 `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`（且二者是公开级别，不等于放松 RLS）。

---

## 6. TypeScript 严格约定

`tsconfig.app.json` 开了 `strict`、`noUnusedLocals/Params`、`noImplicitOverride`、`noUncheckedIndexedAccess`、`verbatimModuleSyntax`、`erasableSyntaxOnly`、`noFallthroughCasesInSwitch`。

禁止（除非用户明确要求并说明原因）：

```ts
any   as any   @ts-ignore   as unknown as X
```

优先：Supabase 生成类型、类型收窄、类型守卫、显式返回类型、用 `unknown` 代替 `any`。

**类型只能来自真实 schema 生成的 `src/types/database.ts`**（`SupabaseClient<Database>`）；禁止依据 `docs/database-schema.md` 之类「猜一版」手写 `Database`，禁止凭空新增表/字段/枚举。`pnpm db:types` 失败时报告 `BLOCKED`，**不手写替代产物**。

---

## 7. 路径别名与导入约定

- `@/*` → `src/*`（Vite 与 TS 均已配置）。统一：

  ```ts
  import { cn } from "@/lib/utils";
  import { getSupabaseClient } from "@/services/supabase";
  ```

- 禁止长相对路径回退（`../../../lib/utils`）。
- `cn()` 只在 `src/lib/utils.ts` 一处；**shadcn CLI 新生成组件默认 `import { cn } from 'cn'`，加完组件要改回 `@/lib/utils`**。

---

## 8. 开发纪律（跨 Phase 恒定）

- **Phase 纪律**（`phase-discipline.md`）：只实现用户当前明确授权的 Phase；不主动跨 Phase、不「顺手」做未来功能；发现未来需求只记录不实现；当前 Phase 完成即停，等待明确授权。Phase 的定义源以 `docs/phases/` 为准（当前进度见根 README 阶段表）。
- **Build Gate**：每个 Phase 结束前 `pnpm lint` + `pnpm build`（含类型生成检查）必须通过，未过不得宣称完成、不得进下一 Phase。
- **Git**（`git.md`）：改前先看 `git status`；禁止 `reset --hard` / `clean -fd` / `checkout -- .` / `--force` push / 未经要求的 `--amend`；只在明确要求时 commit/push；默认停在「已改未提交」并列出改动文件；不提交 `.env*`、`node_modules/`、`dist/`、真密钥。
- **Shell / 环境**（`shell-runtime.md`）：先识别 shell 与包管理器是否可用，不擅自改 PATH / shell 配置；引导即报错就停止并报告环境故障，不换写法绕过沙箱拦截；区分「项目错误 vs 环境错误」，不把环境错误伪装成代码去「修」。
- **结果纪律**：任何命令（lint/build/test/类型生成/commit/push）**只有真实执行且成功**才可声称成功；生成类产物失败时报 `BLOCKED`，不伪造。

---

## 9. 初始化关键决策速查

| 决策 | 取舍 | 影响 |
| --- | --- | --- |
| Base UI 而非 Radix | 跟随 shadcn `base-nova` 新 primitive | 组件 primitive 迁移时注意 API 差异 |
| Tailwind 4 无 config | CSS-first，更快更简 | 主题改 `src/index.css`，勿找 `tailwind.config.js` |
| TS6 弃用 baseUrl | 只用 `paths` + Vite alias | 两处别名必须一致 |
| 列级 GRANT 收口答案 | 比纯 RLS 更严 | 加/删列要同步维护白名单与授权 |
| 类型只从库生成 | 杜绝「猜测版 schema」 | 改库结构后必须 `pnpm db:types` |
| 前端零 service_role | 安全边界 | 同步/建库是受控脚本，不在运行时 |

---

**相关文档：** 环境搭建与运行见 [`getting-started.md`](./getting-started.md)；硬约束原文见 [`.codebuddy/CODEBUDDY.md`](../.codebuddy/CODEBUDDY.md)；能力现状与 Roadmap 见根 [`README.md`](../README.md)。
