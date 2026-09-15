# English2 · 考研英语二真题学习系统

一个**个人 / 家庭使用**的考研英语二（Postgraduate Entrance Exam English II）真题系统练习 Web App，PC 与手机都能用。

> 当前能力：真题数据（2010–2026 共 17 套）已入库，前端已可**登录并浏览题库列表与试卷详情**。**做题、错题、完整考试、学习统计等尚未实现**（见「Roadmap」）。本 README 只描述仓库里真实存在的状态。

- **不是**《新概念英语 2》App；New Concept English 2 属于个人英语学习计划，不在本项目范围内。

---

## 三种角色，三条事实

| 角色 | 定位 | 说明 |
| --- | --- | --- |
| GitHub `data/exams/` | Source of Truth | 题库源文件 `papers-YYYY.json`，人工维护后 `git push`；仅用于同步 / 校验 / 审计 |
| Supabase PostgreSQL | Runtime Database | 运行时**唯一**读取源；同步后的线上题库 |
| React Client | Learning Client | 运行时**只读 Supabase**，不直接读 GitHub Raw |

- 正常学习：`React → Supabase`。
- 题库同步：`data/exams/ →（计算 SHA-256）→ sync_exam_paper RPC → Supabase`，是**受控的后端 / 脚本动作**（现由 service_role / CLI 通道完成），**不是**前端运行时去 fetch GitHub Raw。
- 学习进度持久化（如答题记录、错题）目前**尚未实现**，见 Roadmap。

---

## 技术栈

- **框架**：React + TypeScript（`strict: true`，禁止 `any` / `as any` / `@ts-ignore`）
- **构建**：Vite
- **样式**：Tailwind CSS 4（`@import "tailwindcss"` + `@tailwindcss/vite`，无 `tailwind.config.js`）
- **UI**：shadcn/ui，底层 primitive 为 **Base UI**（`@base-ui/react`），不使用 Radix UI
- **路由**：React Router（v7，`createBrowserRouter`，页面组件路由级懒加载）
- **数据**：Supabase（`@supabase/supabase-js`）+ TanStack Query
- **表单**：React Hook Form + Zod
- **图标**：Lucide React
- **工具**：clsx、tailwind-merge、class-variance-authority、date-fns
- **包管理器**：**只用 pnpm**

---

## 架构

单向数据链，严格禁止越层：

```text
Page  →  Hook  →  Service  →  Supabase
```

- **Service（`src/services/`）**：唯一可 import Supabase client、访问数据库的层；负责查询、RPC、DTO 映射与错误归一化，导出纯函数。
- **Hook（`src/hooks/`）**：唯一使用 TanStack Query 的层；调用 Service，queryKey 统一走 `src/lib/constants.ts` 的 `examKeys`。
- **Page / Component**：只消费 Hook 的数据与状态，**不直接** `supabase.from(...)` / `supabase.rpc(...)` / `supabase.auth.*`。
- 数据库类型来自真实 Supabase schema 生成的 `src/types/database.ts`（`SupabaseClient<Database>`），**不手写 schema 类型**。

---

## 数据与 Supabase

运行时数据库为 Supabase PostgreSQL，核心业务表：

```text
exam_papers · exam_sections · section_items · item_options   （题库，只读）
practice_sessions · practice_answers · mistakes · mistake_reviews   （用户行为，尚未接入写入）
```

- **真题源**：仓库 `data/exams/papers-YYYY.json`（Source of Truth，不可移动 / 重命名）。每年 9 大题：4 阅读 + 1 完形 + 1 新题型 + 1 翻译 + 2 写作；顶层为长度 9 的数组（元素是大题，不是 paper）。
- **同步**：对 `data/exams` 计算 SHA-256 指纹，调用 `sync_exam_paper` RPC 写库；同指纹幂等（不产生重复版本）。已全量同步 2010–2026：**17 papers / 153 sections / 816 items / 3290 options**。
- **答案隔离**：详情页只读题面。`correct_option`、`explanation`、翻译参考答案（`reference_translation` 及翻译题的 `passage_zh`）、`source_data` **都不会下发到浏览器**——Service 用显式列白名单 + 逐字段重建 DTO，答案从未离开数据库。写作「参考范文」（`sample`）是有意展示的公开学习内容，默认折叠。
- **RLS（题库四表）**：`authenticated` 仅 SELECT；普通登录用户**不能**直接写题库；写入受控于 `service_role` / 后台同步机制。前端**不持有** `service_role` key。

---

## 已实现功能

```text
登录（Supabase Auth）· 首页 · 真题列表 · 真题详情（只读题面） · 404 / 试卷不存在 / 非法 UUID 兜底 · Protected Route · 路由级代码分割 · 题库错误文案归一化
```

- 路由：`/login`、`/`（首页）、`/exams`（列表，17 套按年份倒序）、`/exams/:paperId`（详情，按真实 UUID 定位，只铺题面）、`*`（404）。应用内路由在 `ProtectedRoute` 之下，未登录跳 `/login`。
- 详情按题型渲染并做了数据容错：选项字母优先沿用题面自带前缀（如 2010 新题型 `T/F`、2026 `A–G`），翻译题隐藏中文参考，写作图表支持「结构化图 / 图片 / 占位提示」三态。

## 学习闭环（长期目标）

```text
真题 → 练习 → 答题记录 → 错题 → 错题复习 → 完整考试 → 学习统计
```

这是产品规划，**当前只到「真题浏览」**；练习及其之后的环节尚未实现。

## Roadmap / 尚未实现

- Practice：做题、答题记录、提交后显示答案与解析
- 错题本与错题复习
- 完整考试模式
- 学习统计
- PWA / 移动端完整体验 / 离线
- 题库同步的前端 UI（目前同步为受控脚本 / 后台动作，无应用内「同步」按钮）

---

## 开发阶段

| 阶段 | 内容 |
| --- | --- |
| Phase 1 | 项目初始化：脚手架、规则、技术栈 |
| Phase 2 | Supabase 类型化数据访问（生成 `database.ts`、typed client） |
| Phase 3 | Authentication（Supabase Auth + `ProtectedRoute` + 登录页） |
| Phase 4 | 题库数据基础设施与安全：4A 全量真题同步 → 4B 死代码常量清理 → 4C 前端数据层（嵌套查询 + DTO） → 4D 题库列表与详情 UI → 4E 答案数据隔离 + 题库 RLS 收口 |
| Phase 4F | 收尾加固：F1 翻译参考隔离 · F5 结构化图表 · F6 以 `source_id` 判定题型 · F7 错误文案归一化 · F8 路由级代码分割 · F9 / F12 文档对齐 |

---

## 本地开发

```bash
node -v   # ≥ 20.19（当前实测 v22.x）
pnpm -v   # 10.x
```

```bash
pnpm install
cp .env.example .env.local   # 填入真实值
pnpm dev                     # 开发
pnpm build                   # 生产构建（含 tsc）
pnpm lint                    # oxlint
pnpm preview                 # 预览构建产物
```

环境变量（前端只允许这两个；`service_role key`、数据库密码、GitHub Token 一律不得进入前端代码或 `.env.local`）：

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

---

## 目录结构

```text
English2/
├── data/exams/                # GitHub 源题库（Source of Truth，勿移动/重命名）
│   └── papers-2010.json …
├── src/
│   ├── components/
│   │   ├── exams/             # PassageText / ChoiceQuestion / TextQuestion / ExamSection / json-utils
│   │   ├── ui/                # shadcn/ui 组件（Base UI）
│   │   └── protected-route.tsx
│   ├── hooks/                 # use-auth / use-exam-papers / use-exam-paper
│   ├── lib/
│   │   ├── constants.ts       # examKeys（TanStack Query key 工厂）
│   │   └── utils.ts           # cn()
│   ├── pages/                 # LoginPage / HomePage / ExamListPage / ExamDetailPage / NotFoundPage
│   ├── providers/             # auth-context / auth-provider
│   ├── router/index.tsx       # createBrowserRouter + 路由级 React.lazy
│   ├── services/              # supabase / exams / auth（唯一访问库的层）
│   ├── types/database.ts      # 由真实 Supabase schema 生成
│   ├── App.tsx                # RouterProvider
│   ├── main.tsx               # QueryClientProvider + AuthProvider
│   └── index.css              # Tailwind 4 + shadcn 主题变量
├── .env.example
├── components.json            # shadcn 配置（style: base-nova, base: base）
├── tsconfig.json              # 仅 @/* paths，不写 baseUrl（TS6 已废弃）
└── vite.config.ts             # react + tailwindcss + @ alias
```

---

## 约定

- 路径别名 `@/*` → `src/*`（Vite 与 TypeScript 均已配置，根 `tsconfig.json` 不写 `baseUrl`）。
- `cn()` 统一在 `src/lib/utils.ts`（clsx + tailwind-merge）。shadcn CLI 新生成组件默认 `import { cn } from 'cn'`，加组件后需改回 `@/lib/utils`。
- 页面不直接写 `supabase.from(...)`，统一走 `Service → Hook → Page`。
- 详情页**不渲染**任何答案 / 解析；未来做题功能才在提交后展示。
- 不为「目录好看」提前创建空目录，随阶段逐步建立。

---

## 安全说明

- 前端只使用 `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`（二者为公开 anon/publishable 级别，不等于放松 RLS）。
- 严禁在代码、构建产物、日志、聊天、提交中出现 `service_role` key、数据库密码、token 或任何可绕过 RLS 的凭据。
- `.env` / `.env.local` 已在 `.gitignore`，只提交 `.env.example`（且只写占位符）。
- 题库四表启用 RLS；`authenticated` 只读，写操作受控于 `service_role` / 后台同步。
