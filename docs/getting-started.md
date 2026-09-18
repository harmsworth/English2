# 环境与技术栈初始化（Getting Started）

> 目标：把一个空白的本地环境，一步步拉到「English2 能在浏览器里登录、浏览题库、在线练习并看到判分结果」的可运行状态。
> 本篇只讲**怎么把项目跑起来**（环境 + 依赖 + 配置 + 数据库初始化 + 同步 + 验证）。
> 项目**为什么这样搭**（分层架构、安全边界、约定与纪律）见 [`project-initialization.md`](./project-initialization.md)。
> 更上层的总览仍以仓库根 [`README.md`](../README.md) 为准，本篇是它的操作化补充。

---

## 0. 前置认知：数据从哪里来

跑起来之前先记住这条单向链，后文所有配置都围绕它：

```text
data/exams/*.json  （GitHub 源题库 · Source of Truth）
        │  计算 SHA-256 指纹 → sync_exam_paper RPC（受控后端/脚本，service_role/CLI）
        ▼
Supabase PostgreSQL（运行时 · 前端唯一读取源）
        │  supabase-js（publishable key + RLS）
        ▼
React Client（只读题库；用户行为数据可写，受 RLS 归属本人）
```

- 前端**永远**从 Supabase 读题库，不会去 fetch GitHub raw JSON。
- 所以「跑起来」需要两样东西就位：**本地依赖** + **一个已初始化的 Supabase 项目**。

---

## 1. 工具链与版本要求

| 工具 | 要求 | 说明 |
| --- | --- | --- |
| Node.js | ≥ 20.19（实测 v22.x） | Vite 8 的最低要求 |
| pnpm | 10.x | **本项目只用 pnpm**，不要用 npm / yarn 装依赖 |
| Git | 任意较新版本 | 主分支为 `main` |
| Supabase CLI | 仅数据库初始化 / 生成类型时需要 | 纯前端开发不需要 |

先自检：

```bash
node -v    # 期望 v20.19+ / v22.x
pnpm -v    # 期望 10.x
```

> 若没有 pnpm：`corepack enable`（随 Node 分发）或用 `npm i -g pnpm@10`。装完后**统一用 pnpm** 命令，避免生成第二份 lockfile。

---

## 2. 获取代码并安装依赖

```bash
git clone <repo-url> English2
cd English2
git status --short        # 动手前先确认工作区干净、分支为 main
pnpm install              # 严格按 pnpm-lock.yaml 安装
```

安装后关键依赖（版本以 `package.json` 为准）大致是：

- 框架：`react` / `react-dom` 19、`typescript` ~6.0
- 构建：`vite` 8、`@vitejs/plugin-react` 6
- 样式：`tailwindcss` 4 + `@tailwindcss/vite`（**无** `tailwind.config.js`，主题在 `src/index.css`）
- UI：`shadcn` 4（style `base-nova`）、底层 primitive 为 `@base-ui/react`（**不用 Radix**）
- 数据：`@supabase/supabase-js` 2 + `@tanstack/react-query` 5
- 路由：`react-router-dom` 7；表单：`react-hook-form` + `zod`；图标：`lucide-react`

---

## 3. 配置环境变量（`.env.local`）

前端**只允许**读取以下变量；`service_role key`、数据库密码、GitHub Token 一律禁止进入前端代码或 `.env.local`。

```bash
cp .env.example .env.local
```

`.env.local` 字段（`.env.example` 里是占位符，需填真实值）：

```env
VITE_SUPABASE_URL=                  # Supabase 项目 Settings → API → Project URL
VITE_SUPABASE_PUBLISHABLE_KEY=      # 项目 publishable key（新版 sb_publishable_… 与旧版 anon key eyJ… 等价可互换）

VITE_DEV_LOGIN_EMAIL=               # 可选：仅本地便捷登录辅助，非生产
VITE_DEV_LOGIN_PASSWORD=            # 可选：同上
```

要点：

- 变量名必须与代码读取名**逐字一致**（`src/services/supabase.ts` 读的就是 `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`）。名字写错会让客户端被判为「未配置」并抛错。
- `.env.local` / `.env` 已在 `.gitignore` 中，**不要**从 `.gitignore` 移除，也**不要**提交真值。仓库里只提交 `.env.example`（占位符）。
- publishable/anon key 本身是公开级别，**不等于**可以放松 RLS——权限仍由数据库侧策略兜底。

> 如果没有 Supabase 项目，先做第 4 步。

---

## 4. Supabase 项目与数据库初始化

> ⚠️ 重要事实：本仓库**没有**签入 `.sql` 迁移文件，`supabase/` 目录下只有 CLI 的 `.temp/` 本地状态（已被 `.gitignore`）。按项目规则，**实际的 Supabase PostgreSQL 数据库是 schema 的最终事实来源**，文档和代码都不反推它。因此这一节区分两种情形。

### 情形 A — 已有初始化好的 Supabase 项目（当前状态）

直接把项目 URL + publishable key 填进 `.env.local`（第 3 步）即可。核对现状用**只读**方式，不改库：

```bash
# 关联已有项目（写入 supabase/.temp/，本地状态，不提交）
supabase link --project-ref btrgtbhiheosntzfjhxh

# 只读核对 schema / policies / grants（走 Management API，无需本地 Docker，但冷启动较慢，给足超时）
supabase db query --linked "select tablename, rowsecurity from pg_tables where schemaname='public';"
```

运行时数据库应包含的核心表（详见 README「数据与 Supabase」）：

```text
题库（只读）    exam_papers · exam_sections · section_items · item_options
用户行为        practice_sessions · practice_answers · mistakes · mistake_reviews
```

数据库初始化时**必须**已具备的约束（这些是设计边界，缺了会破坏答案隔离/权限）：

- **RLS**：题库四表启用行级安全，`authenticated` 仅 SELECT；普通登录用户不能直接写题库。
- **列级授权**：对 `exam_sections` / `section_items` 等，`correct_option`、`explanation`、`source_data`、翻译题 `passage_zh` 等答案/解析列通过**列级 GRANT/REVOKE** 移出前端可读集合——因为 RLS 不限列，仅靠表级 SELECT 会被绕过，答案隔离必须靠列级权限收口。
- **判分 RPC**：客观题判分由服务端 `SECURITY DEFINER` RPC 完成，答案不下发到浏览器判分。
- **同步 RPC**：存在 `sync_exam_paper`，按 SHA-256 指纹幂等写入题库。

> 权限/边界类改动属于敏感操作：改前先只读审查、贴 diff 人工 review 后再执行，**默认不 push**。

### 情形 B — 全新 Supabase 项目（从零复现）

仓库未提供可直接重放的迁移脚本，从零复现需要：在 Supabase 控制台/`supabase/migrations` 里按上面的表结构 + RLS + 列级授权 + RPC 逐条建立，再走情形 A 的核对确认终态一致。若你手上有一套已跑通的线上库，优先**连它**而不是重建，避免 schema 漂移。生成类型前先确保线上表已就位（第 5 步依赖它）。

---

## 5. 生成数据库类型

前端类型必须从**真实 Supabase schema** 生成，不要手写「猜测版」`Database` 类型：

```bash
pnpm db:types
# 等价：supabase gen types typescript --project-id btrgtbhiheosntzfjhxh > src/types/database.ts
```

- 成功后 `src/types/database.ts` 会被刷新；`SupabaseClient<Database>` 泛型由此而来。
- **若 CLI 因环境失败，报告 BLOCKED，不要手填替代产物**（这是项目硬规则）。
- schema 变更后应重跑本命令，再 `pnpm build` 让类型错误暴露出来。

---

## 6. 题库数据同步（首次或题库更新时）

运行时题库来自 Supabase，`data/exams/` 是源。同步是**受控后端/脚本动作**（service_role / CLI），不是前端运行时行为：

1. 源文件：`data/exams/papers-YYYY.json`（2010–2026 共 17 套，每年 9 大题，顶层是长度 9 的数组，元素是大题）。
2. 计算文件 SHA-256 作为版本指纹。
3. 调用 `sync_exam_paper` RPC 写入 Supabase；**同指纹幂等**，不产生重复版本。

当前已全量同步 2010–2026：**17 papers / 153 sections / 816 items / 3290 options**。

> `data/exams/index.json` 与 `manifest.json` 是**离线同步产物/指纹**，运行时前端零引用，**不要**当作真题列表数据源，也不要随手删改。（真题列表来自 `exam_papers` 表。）

---

## 7. 运行

```bash
pnpm dev        # 开发服务器（Vite）
pnpm build      # 生产构建：tsc -b && vite build
pnpm lint       # oxlint 代码检查
pnpm preview    # 预览构建产物（先 build）
```

- `pnpm dev` 默认只绑 `localhost`（`[::1]`）。若要用 `curl` / 自动化 / 局域网访问 `127.0.0.1` 被拒，显式指定 host：

  ```bash
  pnpm dev --host 127.0.0.1 --port 5173 --strictPort
  ```

- 打开终端提示的地址，用 `.env.local` 里配置好的 Supabase Auth 账号登录，进入 `/exams` 列表 → 详情（只读题面）→ 在线练习 → 提交判分。

---

## 8. 验证清单（跑通 = 全部为真）

以**实际执行结果**为准，任一失败按 BLOCKED 报告，不伪造：

```bash
pnpm lint       # 期望 0 error
pnpm build      # 期望 tsc 0 报错 + vite build 成功
```

浏览器侧冒烟：

- 未登录访问应用内路由 → 跳 `/login`。
- 登录后 `/exams` 列出 17 套（按年份倒序）。
- 打开任一套详情：**页面上看不到任何答案 / 解析**（答案隔离生效）。
- 进入练习，逐题点选 → 刷新页面能断点恢复。
- 提交后由服务端判分，结果页展示对错、正确答案与解析。

---

## 9. 常见环境坑（Windows / Git Bash）

- **包管理器**：只用 `pnpm`；不要混用 npm/yarn，以免产生第二份 lockfile。
- **Vite host**：默认 `[::1]`，脚本/自动化走 `127.0.0.1` 需 `--host`（见第 7 步）。
- **Supabase CLI**：`db query --linked` 走 Management API，只读查 schema 可行但冷启动慢，给足超时；`db pull` / `db diff` 需本地 Docker shadow，Docker 没起会失败。
- **key 名称**：新版 publishable key（`sb_publishable_…`）与旧版 anon key（`eyJ…`）等价可互换，但**变量名要与代码读取名一致**。
- **杀端口**（Git Bash）：`MSYS_NO_PATHCONV=1 taskkill /PID <pid> /F`。
- **临时跑脚本**：本机系统 `python` 可能是商店占位符；需要时用 `uv run --python 3.12 --with <pkg> python ...`。

---

**相关文档：** 设计决策与约定见 [`project-initialization.md`](./project-initialization.md)；能力现状与 Roadmap 见根 [`README.md`](../README.md)。
