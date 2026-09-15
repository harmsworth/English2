# English2 · 考研英语二真题学习系统

一个个人使用的考研英语二真题学习 Web App，PC 与手机都可用。

当前进度：**Phase 1（项目初始化）已完成**。后续阶段按 Phase 逐个推进，每个 Phase 结束都会跑一次 `pnpm build` 作为质量闸门。

---

## 三个角色，三条铁律

| 角色 | 定位 | 说明 |
| --- | --- | --- |
| GitHub | Source of Truth | 题库源文件在 `data/exams/papers-YYYY.json`，人工维护后 `git push` |
| Supabase | Runtime Database | 同步后的线上题库，正常学习时 React 只读它 |
| React | Learning Client | 学习 UI，只在「同步题库」时才去读 GitHub Raw |

- 正常学习：`React → Supabase`
- 题库同步：`GitHub → SHA-256 → Supabase RPC`
- 学习进度：`React → localStorage`（临时状态，不是数据库）

React 只读取 GitHub，**不会**写 GitHub，也不会把题库 JSON 当数据库用。

---

## 技术栈

- **框架**：React + TypeScript（`strict: true`，禁止 `any` / `as any` / `@ts-ignore`）
- **构建**：Vite
- **样式**：Tailwind CSS 4（`@import "tailwindcss"` + `@tailwindcss/vite`，无 `tailwind.config.js`）
- **UI**：shadcn/ui，底层 primitive 为 **Base UI**（`@base-ui/react`），不使用 Radix UI
- **路由**：React Router
- **数据**：Supabase（`@supabase/supabase-js`）+ TanStack Query
- **表单**：React Hook Form + Zod
- **图标**：Lucide React
- **工具**：clsx、tailwind-merge、class-variance-authority、date-fns
- **包管理器**：**只用 pnpm**

---

## 环境要求

```bash
node -v   # v22.22.2
pnpm -v   # 10.10.0
```

## 安装

```bash
pnpm install
```

## 环境变量

复制示例文件并填写真实值：

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

> 前端只允许这两个变量。`service_role key`、数据库密码、GitHub Token 一律不得进入前端代码或 `.env.local`。

## 开发

```bash
pnpm dev
```

## 构建

```bash
pnpm build
```

## 代码检查

```bash
pnpm lint
```

## 预览构建产物

```bash
pnpm preview
```

---

## 题库同步机制

题库文件按年份拆分，路径固定为：

```text
data/exams/papers-2010.json
data/exams/papers-2011.json
...
```

需要参与同步的文件集中在 `src/lib/constants.ts`：

```ts
export const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/harmsworth/English2/main/data/exams'

export const EXAM_FILES = ['papers-2010.json'] as const
```

新增年份时只往 `EXAM_FILES` 里追加文件名即可，不要改动其它逻辑。

同步流程（Phase 15 实现）：

```text
点击「同步题库」
      ↓
读取 EXAM_FILES
      ↓
fetch GitHub Raw
      ↓
response.text() 取原始文本
      ↓
SHA-256(原始文本)        ← 必须先 hash 再 JSON.parse
      ↓
JSON.parse + 基础校验
      ↓
supabase.rpc('sync_exam_paper', {...})
      ↓
invalidateQueries → 题库列表 / 试卷详情重新获取
```

> Hash 必须对**原始文本**计算，不能 `JSON.parse` 后再 `JSON.stringify`，两者结果可能不一致。

`p_source_file` 传真实路径 `data/exams/papers-2010.json`（不是 `content/exams/...`）。

---

## 目录结构

```text
English2/
├── data/
│   └── exams/                 # GitHub 源题库（Source of Truth，不要移动/重命名）
│       └── papers-2010.json
├── public/
├── src/
│   ├── components/
│   │   └── ui/                # shadcn/ui 组件（Base UI）
│   ├── layouts/               # AppLayout（Phase 6）
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   └── NotFoundPage.tsx
│   ├── router/
│   │   └── index.tsx
│   ├── services/
│   │   └── supabase.ts        # 懒加载单例，不硬编码 key
│   ├── hooks/                 # Phase 5
│   ├── types/                 # Phase 3
│   ├── lib/
│   │   ├── constants.ts       # EXAM_FILES / GITHUB_RAW_BASE / query keys
│   │   └── utils.ts           # cn()
│   ├── App.tsx
│   ├── main.tsx               # QueryClientProvider
│   └── index.css              # Tailwind 4 + shadcn 主题变量
├── .env.example
├── .gitignore
├── components.json            # shadcn 配置（style: base-nova, base: base）
├── package.json
├── tsconfig.json              # 仅 @/* paths，不写 baseUrl（TS 6 已废弃）
├── tsconfig.app.json
├── tsconfig.node.json
└── vite.config.ts             # react + tailwindcss + @ alias
```

---

## 约定

- 路径别名 `@/*` → `src/*`，Vite 与 TypeScript 都已配置。
- `cn()` 统一放在 `src/lib/utils.ts`（clsx + tailwind-merge）。shadcn CLI 新生成的组件默认 `import { cn } from 'cn'`，新增组件后需改为 `import { cn } from '@/lib/utils'`。
- 页面不直接写 `supabase.from(...)`，统一走 `Service → Hook → Page`。
- 做题过程中 UI **不得**渲染 `ans` / `explain`；提交后才显示答案与解析。
- 不要为了目录结构提前创建大量空目录，随 Phase 逐步建立。

---

## 尚未实现（后续 Phase）

题库同步、Supabase 连接、类型系统、题库列表、试卷、做题与解析、完形填空、新题型、翻译、作文、设置页、学习记录、错题、统计、AI 辅助、登录。
