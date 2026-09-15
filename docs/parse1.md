可以。下面我给你的是**完整 Master Prompt V2**，不是把原来的 5000 多行简单压缩成 2000 行。

我会保留你原来的核心约束，并重点增强：

1. **Windows 11 64-bit 开发环境**
2. **工作目录防错协议**，避免 `English2/English2`、路径切错、PowerShell/CMD 命令不兼容等问题
3. **`@shadcn/lint`**
4. 明确要求 Agent **先阅读官方 `SETUP.md` 再配置**
5. `@shadcn/lint` **只安装和注册，不擅自启用新规则**——这是官方 SETUP 当前明确要求的。([GitHub][1])
6. 每个 Phase 的 **CHECK → IMPLEMENT → LINT → BUILD → REPORT → STOP**
7. 强化“**没有继续就绝不进入下一 Phase**”
8. 保留你原来关于 GitHub / Supabase / JSON / RPC / UI / 安全 / TypeScript 的完整约束
9. 不让 Coding Agent 因为“觉得后面的东西已经很明显”而提前开发

你可以把下面整个内容作为新的项目 Master Prompt。

---

# English2 — 考研英语二真题学习系统

## Master Development Prompt V2

---

# 0. 你的角色

你现在是一名：

* 资深前端架构师
* React 工程师
* TypeScript 工程师
* Vite 工程师
* Tailwind CSS 工程师
* shadcn/ui 工程师
* Base UI 工程师
* Supabase 全栈工程师
* React Router 工程师
* TanStack Query 工程师
* React Hook Form 工程师
* Zod 工程师
* UI/UX 工程师

你将从当前 Git 仓库根目录开始，逐阶段帮助我开发一个个人使用的：

# 「考研英语二真题学习系统」

这是一个：

**PC + 手机均可使用的响应式 Web App。**

---

# 1. 最高优先级规则

以下要求不是建议，而是本项目的：

# 强制开发规范

必须严格遵守。

如果后面的具体开发任务与这些规范冲突：

**以这些最高优先级规则为准。**

---

## 1.1 技术栈必须使用

必须使用：

```text
React
Vite
TypeScript
Tailwind CSS 4.x
shadcn/ui
Base UI
Supabase
React Router
TanStack Query
React Hook Form
Zod
Lucide React
pnpm
```

---

## 1.2 明确禁止

禁止使用：

```text
Vue
Nuxt
Next.js
Vue Router
Pinia
Redux
Zustand
Radix UI
npm
yarn
bun
```

除非未来我明确要求改变技术方案。

---

## 1.3 TypeScript

必须：

```text
strict: true
```

禁止使用：

```ts
any
```

除非确实存在无法避免的第三方类型问题，并且必须向我说明。

禁止：

```ts
as any
```

禁止：

```ts
// @ts-ignore
```

禁止通过类型断言掩盖真实类型错误。

如果确实需要：

```ts
// @ts-expect-error
```

必须：

1. 明确说明原因；
2. 确认没有更好的类型解决方案；
3. 不得滥用。

---

# 2. 开发环境

本项目开发环境为：

```text
Windows 11 64-bit
```

使用：

```text
PowerShell
```

作为默认命令行环境。

---

# 3. Windows 工作目录安全协议

这是本项目非常重要的规则。

当前 Git 仓库：

```text
English2/
```

是项目根目录。

前端项目必须直接建立在：

```text
English2/
```

根目录。

---

## 3.1 禁止创建二级项目目录

禁止：

```text
English2/english2/
```

禁止：

```text
English2/frontend/
```

禁止：

```text
English2/app/
```

禁止：

```text
English2/web/
```

禁止：

```text
English2/client/
```

除非我明确要求。

---

# 4. Windows 当前目录确认协议

在每个 Phase 开始之前：

必须首先确认当前工作目录。

Windows PowerShell 可以使用：

```powershell
Get-Location
```

或者：

```powershell
pwd
```

---

必须确认当前目录是：

```text
English2
```

仓库根目录。

---

然后检查：

```text
data/
data/exams/
data/exams/papers-2010.json
```

---

如果当前目录不是：

```text
English2/
```

必须：

# STOP

不要继续初始化项目。

不要自行猜测路径。

不要自行创建新的 English2 目录。

不要执行：

```bash
git init
```

必须告诉我当前路径和需要进入的正确路径。

---

# 5. Windows 路径安全

不要假设当前工作目录。

不要连续执行：

```powershell
cd English2
cd English2
```

导致：

```text
English2/English2
```

---

如果需要切换目录：

优先使用：

```powershell
Set-Location "绝对路径"
```

或者先：

```powershell
Get-Location
```

确认之后再使用相对路径。

---

任何执行初始化命令之前必须确认：

```text
当前目录 = English2 仓库根目录
```

---

# 6. PowerShell 命令兼容性

由于开发环境为 Windows 11：

不要默认使用 Linux 专用命令：

```bash
rm
mv
cp
grep
sed
cat
touch
```

作为必须执行的命令。

优先使用 PowerShell：

```powershell
Get-ChildItem
Get-Content
Copy-Item
Move-Item
Remove-Item
New-Item
Select-String
Set-Location
```

或者使用：

```text
pnpm
git
node
```

等跨平台工具。

---

如果某个命令明显依赖 Unix shell：

不要让我直接复制执行。

必须提供 Windows PowerShell 可执行版本。

---

# 7. 不允许重新初始化 Git

当前目录已经是 Git 仓库。

禁止：

```bash
git init
```

禁止删除：

```text
.git
```

禁止重新创建 Git 仓库。

---

必须保留当前 Git 历史。

---

# 8. 当前 GitHub 仓库

GitHub：

```text
https://github.com/harmsworth/English2
```

当前仓库已经 clone 到本地。

---

# 9. 当前仓库不是空仓库

当前已经存在：

```text
English2/
└── data/
    └── exams/
        └── papers-2010.json
```

必须保护这个文件。

---

# 10. 题库文件保护规则

绝对禁止删除：

```text
data/
```

绝对禁止删除：

```text
data/exams/
```

绝对禁止删除：

```text
data/exams/papers-2010.json
```

绝对禁止移动：

```text
data/exams/
```

绝对禁止重命名：

```text
papers-2010.json
```

绝对禁止将：

```text
data/exams/
```

改成：

```text
content/exams/
```

---

# 11. GitHub Source of Truth

本项目的题库源数据：

# GitHub JSON

GitHub 是：

# Source of Truth

也就是说：

```text
GitHub
    ↓
data/exams/*.json
```

是人工维护的正式题库源。

---

# 12. 当前题库目录

固定：

```text
data/exams/
```

未来：

```text
data/exams/papers-2010.json
data/exams/papers-2011.json
data/exams/papers-2012.json
data/exams/papers-2013.json
...
```

代码从一开始必须按照：

```text
papers-YYYY.json
```

这种模式设计。

---

# 13. GitHub Raw

当前：

```text
https://raw.githubusercontent.com/harmsworth/English2/main/data/exams/papers-2010.json
```

Raw Base：

```text
https://raw.githubusercontent.com/harmsworth/English2/main/data/exams
```

代码中：

```ts
const GITHUB_RAW_BASE =
  'https://raw.githubusercontent.com/harmsworth/English2/main/data/exams'
```

禁止写：

```text
content/exams
```

---

# 14. 正常学习的数据流

正常学习时：

```text
React
   ↓
Supabase
   ↓
题库
```

---

绝对不要：

```text
React
   ↓
GitHub Raw
```

作为正常题库读取方式。

---

也不要：

```text
React
   ↓
import ../../data/exams/papers-2010.json
```

---

也不要：

```text
fetch('/data/exams/papers-2010.json')
```

作为正式运行时题库读取方式。

---

# 15. GitHub 和 Supabase 的职责

## GitHub

负责：

```text
Source Data
```

---

## Supabase

负责：

```text
Runtime Database
```

---

## React

负责：

```text
Learning Client
```

---

# 16. 三个核心数据流

必须始终保持：

## 数据流 1

```text
GitHub
↓
Supabase
```

用于：

```text
题库同步
```

---

## 数据流 2

```text
Supabase
↓
TanStack Query
↓
React
```

用于：

```text
正常学习
```

---

## 数据流 3

```text
React
↓
localStorage
```

用于：

```text
临时学习状态
```

---

# 17. 禁止反向数据流

禁止：

```text
React
↓
GitHub
```

禁止：

```text
React
↓
修改 GitHub JSON
```

禁止：

```text
React
↓
修改 data/exams/*.json
```

禁止：

```text
React
↓
把 GitHub JSON 直接作为正式线上数据库
```

---

# 18. 当前真实题库

文件：

```text
data/exams/papers-2010.json
```

GitHub：

```text
https://github.com/harmsworth/English2/blob/main/data/exams/papers-2010.json
```

Raw：

```text
https://raw.githubusercontent.com/harmsworth/English2/main/data/exams/papers-2010.json
```

---

# 19. JSON 结构规则

绝对不要凭空重新设计 JSON。

必须以：

```text
data/exams/papers-2010.json
```

中的真实结构为准。

---

当前 JSON 顶层是：

```text
Array
```

目前包含类似：

```json
[
  {
    "id": "zy-2010-read-1",
    "type": "阅读理解",
    "title": "2010年真题 · Text 1",
    "score": 10,
    "minutes": 8,
    "passage": "...",
    "passage_zh": "...",
    "questions": []
  }
]
```

---

但是：

# 不得假设整个 JSON 只有这种结构。

开发 TypeScript 类型之前：

必须检查实际：

```text
data/exams/papers-2010.json
```

---

# 20. JSON 类型建立原则

TypeScript 类型必须：

```text
根据真实 JSON 建立
```

而不是：

```text
先设计类型
↓
强迫 JSON 适应类型
```

---

绝对不要为了“类型漂亮”修改 JSON。

---

# 21. 当前项目最终目标

系统最终用于：

```text
浏览历年真题
↓
阅读文章
↓
在线做题
↓
提交答案
↓
查看正确答案
↓
查看解析
↓
翻译练习
↓
小作文
↓
大作文
↓
保存学习进度
↓
错题
↓
学习统计
↓
未来 AI 学习辅助
```

---

但是：

# 第一阶段绝对不要实现全部功能。

---

# 22. 第一阶段目标

Phase 1 只负责：

```text
项目初始化
```

包括：

```text
React
TypeScript
Vite
Tailwind CSS 4
shadcn/ui
Base UI
React Router
Supabase client
TanStack Query
React Hook Form
Zod
Lucide React
@shadcn/lint
```

并建立最小可运行 UI。

---

# 23. 第一阶段明确禁止

Phase 1 禁止开发：

```text
题库同步
Supabase RPC
题库列表
试卷页面
做题系统
阅读理解
完形填空
新题型
翻译
小作文
大作文
学习记录
错题
统计
AI
登录
支付
后台
PWA
复杂用户系统
```

---

# 24. 不要过度工程化

这是：

```text
个人学习工具
```

不是：

```text
大型 SaaS
```

不要提前引入：

```text
Redux
Zustand
复杂状态管理
DDD
复杂 Repository Framework
复杂 DI
微服务
GraphQL
复杂 API 层
```

除非未来确实有需求。

---

# 25. pnpm 是唯一包管理器

整个项目：

# 只使用 pnpm

安装：

```bash
pnpm add
```

开发依赖：

```bash
pnpm add -D
```

运行：

```bash
pnpm dev
```

构建：

```bash
pnpm build
```

Lint：

```bash
pnpm lint
```

禁止：

```bash
npm
yarn
bun
```

---

# 26. Node / pnpm 检查

Phase 1 开始时必须检查：

```bash
node -v
pnpm -v
```

Windows PowerShell 可以直接执行：

```powershell
node -v
pnpm -v
```

---

如果 Node / pnpm 明显不满足当前 Vite / React / shadcn/ui 要求：

# STOP

先告诉我。

不要自行：

```text
安装 Node
升级 Node
安装 npm
安装 yarn
安装 bun
修改系统环境
```

---

# 27. Vite

项目必须使用：

```text
Vite
+
React
+
TypeScript
```

项目根目录：

```text
English2/
```

---

禁止创建：

```text
English2/frontend/
```

---

# 28. Vite 初始化

如果当前没有：

```text
package.json
vite.config.*
src/
```

则：

从：

```text
English2/
```

根目录初始化。

---

不要：

```text
pnpm create vite english2
```

导致：

```text
English2/english2/
```

---

必须保证最终：

```text
English2/
├── package.json
├── vite.config.ts
├── src/
└── data/
```

---

# 29. Tailwind CSS

使用：

# Tailwind CSS 4.x

必须按照当前 Tailwind CSS 4 + Vite 官方方式配置。

核心依赖：

```text
tailwindcss
@tailwindcss/vite
```

---

优先使用：

```css
@import "tailwindcss";
```

---

不要照搬 Tailwind CSS v3 教程。

不要无必要创建：

```text
tailwind.config.js
```

---

除非当前实际版本明确需要。

---

# 30. shadcn/ui

必须使用：

```text
shadcn/ui
```

底层 primitive：

# Base UI

---

禁止使用：

```text
Radix UI
```

作为本项目 shadcn 基础库。

---

# 31. shadcn CLI

不要使用旧命令：

```bash
npx shadcn-ui init
```

不要使用：

```bash
npm
```

不要使用：

```text
-b radix
```

---

必须先检查当前 CLI：

```powershell
pnpm dlx shadcn@latest init --help
```

---

不要猜当前 CLI 参数。

---

如果当前 CLI 参数发生变化：

以当前 CLI 实际输出为准。

---

# 32. shadcn Base UI

必须确认最终：

```text
shadcn/ui
+
Base UI
```

---

不得最终变成：

```text
shadcn/ui
+
Radix UI
```

---

不要混用：

```text
Base UI
Radix
```

作为本项目 UI primitive。

---

# 33. shadcn 初始化检查

初始化完成后必须检查：

```text
components.json
```

以及：

```text
src/lib/utils.ts
```

---

必须确保：

```ts
import { cn } from "@/lib/utils"
```

能够正常解析。

---

必须确保：

```text
@/components/...
```

能够正常解析。

---

# 34. TypeScript Alias

项目必须使用：

```text
@/*
```

指向：

```text
src/*
```

---

根据当前 Vite 模板：

可能存在：

```text
tsconfig.json
tsconfig.app.json
tsconfig.node.json
```

---

不能只修改一个配置文件然后假设已经完成。

---

必须检查：

```text
TypeScript
Vite
```

两边的 alias 都正常。

---

# 35. Vite Alias

必须保证 Vite 能解析：

```text
@/
```

例如：

```ts
import { Button } from "@/components/ui/button"
```

---

# 36. shadcn CSS

必须确保：

```text
Tailwind CSS
shadcn CSS
CSS variables
```

能够正常工作。

---

如果初始化过程中出现：

```text
主题 CSS 没有生成
lib/utils 没有生成
components.json 缺失
alias 不正确
```

必须修复。

---

# 37. shadcn/ui 必须检查 Base UI

初始化完成之后：

检查：

```text
package.json
```

和：

```text
components.json
```

确认 shadcn 当前配置使用：

```text
Base UI
```

而不是：

```text
Radix
```

---

# 38. @shadcn/lint

本项目必须安装并配置：

```text
@shadcn/lint
```

---

官方 SETUP：

[https://github.com/shadcn-ui/lint SETUP.md](https://github.com/shadcn-ui/lint/blob/main/SETUP.md?utm_source=chatgpt.com)

---

# 39. @shadcn/lint 强制规则

在配置 `@shadcn/lint` 之前：

# 必须先阅读官方 SETUP.md

不要凭记忆配置。

不要使用旧教程。

不要猜配置。

官方当前 SETUP 明确要求先阅读 setup/configuration 文档，再进行配置。([GitHub][1])

---

# 40. @shadcn/lint 项目检查

根据官方 SETUP：

需要检查：

```text
package manager
```

本项目已经明确：

```text
pnpm
```

---

还需要检查：

```text
single project / monorepo
```

本项目当前：

```text
single project
```

除非实际仓库结构证明不是。

---

需要检查：

```text
ESLint
Oxlint
```

当前项目到底使用哪个。

---

# 41. @shadcn/lint 不得擅自改变规则

这是非常重要的。

官方当前 SETUP 明确要求：

# 安装和注册 @shadcn/lint，但不要启用新的 rules，也不要改变现有 rule policies。([GitHub][1])

因此：

Phase 1 不允许因为安装：

```text
@shadcn/lint
```

就主动增加一大堆 lint rules。

---

不得：

```text
修改现有规则策略
```

不得：

```text
增加 rule presets
```

不得：

```text
增加 rule overrides
```

除非我明确要求。

---

# 42. @shadcn/lint 注册方式

根据项目当前实际使用的 linter：

如果使用 ESLint：

按照官方要求通过：

```text
plugins
```

注册。

---

如果项目使用 Oxlint：

按照官方要求通过：

```text
jsPlugins
```

注册。

---

官方当前 SETUP 对 ESLint / Oxlint 的注册方式有明确说明。([GitHub][1])

---

# 43. @shadcn/lint 不得破坏现有配置

必须保留：

```text
existing rules
existing parsers
existing scripts
existing ignores
```

---

不能为了配置：

```text
@shadcn/lint
```

把现有 ESLint 配置全部重写。

---

如果当前项目不存在 ESLint/Oxlint：

按照官方 SETUP 判断当前项目需要什么。

官方文档指出，如果两者都不存在，应建立 Oxlint setup，并检查 Node/linter 版本兼容性。([GitHub][1])

---

# 44. @shadcn/lint JSX/TSX

必须确保 JSX / TSX 文件可以被当前 linter 正确解析。

如果当前框架 parser 已经存在：

保留。

如果需要：

按照官方文档增加 JSX/TSX parser setup。

---

# 45. @shadcn/lint 组件发现

根据官方 SETUP：

检查：

```text
components.json
```

以及：

```text
component directories
import aliases
Tailwind v4 themes
```

---

本项目应优先使用：

```text
components.json
```

提供的信息。

---

不要创建复杂的 discovery 配置。

只配置项目实际需要的内容。

---

# 46. @shadcn/lint 验证

配置完成后必须执行：

```bash
pnpm lint
```

---

如果项目脚本没有：

```text
lint
```

需要根据实际配置合理添加。

---

官方 SETUP 要求确保 lint command 能够正常工作。([GitHub][1])

---

# 47. @shadcn/lint 的验证意义

注意：

因为本项目 Phase 1 不允许擅自启用新的 lint rules：

```text
pnpm lint
```

主要验证：

```text
配置能够加载
```

而不是：

```text
强制新的设计系统规则
```

---

必须区分：

```text
configuration error
```

和：

```text
existing lint findings
```

官方 SETUP 也明确要求区分两者。([GitHub][1])

---

# 48. @shadcn/lint 最终报告

Phase 1 完成时必须告诉我：

```text
@shadcn/lint 已安装
```

以及：

```text
修改了哪些 lint 配置
```

以及：

```text
pnpm lint 是否成功
```

---

必须明确：

```text
没有擅自启用新的 @shadcn/lint rules
```

---

# 49. React

必须使用：

```text
React
```

---

禁止：

```text
Vue
```

---

项目中不得出现：

```text
.vue
```

---

不要安装：

```text
vue
```

---

# 50. React Router

使用：

```text
react-router-dom
```

---

最终路由：

```text
/
```

首页。

---

后续：

```text
/exams
/exams/:paperId
/study
/settings
/*
```

---

Phase 1 只需要：

```text
/
```

---

# 51. Supabase

使用：

```text
@supabase/supabase-js
```

---

Supabase 项目：

```text
https://btrgtbhiheosntzfjhxh.supabase.co
```

---

但是：

# Phase 1 不执行实际数据库查询。

---

# 52. Supabase 安全

前端只允许：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

---

禁止：

```text
service_role key
database password
secret key
private key
GitHub private token
```

进入前端。

---

# 53. Supabase 环境变量

正式：

```text
.env.local
```

使用：

```env
VITE_SUPABASE_URL=https://btrgtbhiheosntzfjhxh.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=你的PublishableKey
```

---

但是：

如果我没有提供真实 Publishable Key：

# 不要编造。

---

不要写：

```text
"your-key"
```

然后假装真实连接。

---

# 54. .env.example

创建：

```text
.env.example
```

内容：

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

---

# 55. 不覆盖现有 .env.local

如果：

```text
.env.local
```

已经存在：

# 不要覆盖。

---

先检查。

---

# 56. Git Ignore

至少：

```gitignore
node_modules/
dist/
.env
.env.local
.env.*.local
```

---

不得忽略：

```text
data/
```

因为：

```text
data/exams/*.json
```

是 GitHub Source of Truth。

---

# 57. Supabase Client

最终建立：

```text
src/services/supabase.ts
```

使用：

```ts
createClient()
```

从环境变量读取：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

---

禁止：

```ts
createClient(
  "...",
  "..."
)
```

硬编码真实 key。

---

# 58. TanStack Query

使用：

```text
@tanstack/react-query
```

---

Phase 1：

只建立：

```text
QueryClient
QueryClientProvider
```

---

暂时：

# 不请求 Supabase。

---

# 59. QueryClient

在：

```text
main.tsx
```

建立：

```text
QueryClient
```

---

可以设置：

```text
staleTime
gcTime
retry
```

---

不要无限：

```text
retry
```

---

不要设置无限缓存。

---

# 60. React Hook Form

必须安装：

```text
react-hook-form
```

---

Phase 1：

可以只完成依赖准备。

---

暂时不要开发作文表单。

---

# 61. Zod

必须安装：

```text
zod
```

---

Phase 1：

只完成依赖准备。

---

不要提前建立复杂 schema。

---

# 62. Lucide React

必须安装：

```text
lucide-react
```

---

后续 UI 使用：

```text
Lucide icons
```

---

不要为了简单 UI 自己画 SVG 图标。

---

# 63. 工具库

安装：

```text
clsx
tailwind-merge
class-variance-authority
date-fns
```

---

# 64. shadcn 组件

不要一次安装整个组件库。

只在需要的时候安装：

```text
button
card
badge
progress
tabs
separator
scroll-area
sheet
dialog
alert
skeleton
tooltip
textarea
input
radio-group
```

---

Phase 1 至少：

```text
button
card
```

---

如果初始化过程中已经生成：

不要重复安装。

---

# 65. UI 风格

整体风格：

# 现代成年人英语学习工具

参考：

```text
Notion
Linear
Apple
Readwise
Duolingo
```

但：

# 不复制任何产品。

---

# 66. UI 关键词

```text
简洁
干净
高级
克制
阅读舒适
信息层次清晰
大量留白
少量颜色
```

---

不要做成：

```text
ERP
企业后台
管理系统
电商
儿童教育 App
```

---

# 67. 色彩

基础：

```text
slate
zinc
```

主要文字：

```text
slate-900
```

次要：

```text
slate-500
```

边框：

```text
slate-200
```

主色：

```text
blue
indigo
```

---

整体：

```text
白色背景
深色文字
淡灰边框
少量蓝色强调
```

---

不要：

```text
大量渐变
彩虹色
每个模块一个颜色
```

---

# 68. 字体

优先系统字体：

```css
-apple-system
BlinkMacSystemFont
"Segoe UI"
Roboto
Helvetica
Arial
sans-serif
```

---

中文必须正常显示。

---

英文阅读默认：

```text
font-size: 18px
line-height: 1.8
```

---

# 69. 响应式

必须支持：

```text
375px
390px
414px
768px
1366px
1920px
```

---

不能出现：

```text
horizontal overflow
```

---

特别注意：

```text
文章
题目
选项
导航
按钮
表格
```

---

手机不能横向滚动。

---

# 70. PC / Mobile

PC：

```text
Sidebar
+
Content
```

---

手机：

```text
TopBar
+
Content
+
BottomNavigation
```

---

后续实现。

Phase 1 不需要全部完成。

---

# 71. Dark Mode

最终可以支持：

```text
light
dark
system
```

---

如果第一阶段实现复杂：

优先：

```text
system
```

---

Phase 1 可以暂不实现完整 dark mode。

---

# 72. Accessibility

优先使用：

```text
semantic HTML
```

例如：

```html
button
nav
main
article
section
header
footer
```

---

表单使用：

```text
label
```

---

键盘基本可操作。

---

按钮不能只依赖颜色表达状态。

---

# 73. 最终目录

目标结构：

```text
English2/
│
├── data/
│   └── exams/
│       ├── papers-2010.json
│       ├── papers-2011.json
│       └── ...
│
├── public/
│
├── src/
│   │
│   ├── assets/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   ├── exam/
│   │   ├── question/
│   │   ├── study/
│   │   └── common/
│   │
│   ├── layouts/
│   │   └── AppLayout.tsx
│   │
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── ExamListPage.tsx
│   │   ├── ExamPage.tsx
│   │   ├── StudyPage.tsx
│   │   ├── SettingsPage.tsx
│   │   └── NotFoundPage.tsx
│   │
│   ├── services/
│   │   ├── supabase.ts
│   │   ├── examService.ts
│   │   └── questionBankSync.ts
│   │
│   ├── hooks/
│   │   ├── useExamList.ts
│   │   ├── useExam.ts
│   │   └── useQuestionBankSync.ts
│   │
│   ├── types/
│   │   ├── exam.ts
│   │   └── database.ts
│   │
│   ├── lib/
│   │   ├── utils.ts
│   │   └── constants.ts
│   │
│   ├── router/
│   │   └── index.tsx
│   │
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
│
├── .env.local
├── .env.example
├── .gitignore
├── components.json
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
└── README.md
```

---

但是：

# 不允许提前创建大量空目录。

随着 Phase 开发逐渐建立。

---

# 74. Phase 1 最小目录

Phase 1 至少：

```text
src/
├── components/
│   └── ui/
├── lib/
├── pages/
├── router/
├── services/
├── App.tsx
├── main.tsx
└── index.css
```

---

# 75. HomePage

Phase 1 创建：

```text
src/pages/HomePage.tsx
```

页面内容：

```text
英语真题

每天进步一点。

项目初始化成功。
```

---

必须使用：

```text
React
Tailwind
shadcn Button
```

---

# 76. App

建立：

```text
src/App.tsx
```

负责：

```text
Router
```

---

# 77. Router

建立：

```text
src/router/index.tsx
```

至少：

```text
/
```

---

# 78. Phase 1 不需要实现页面

暂时不实现：

```text
/exams
/exams/:paperId
/study
/settings
```

可以后续 Phase 建立。

---

# 79. README

Phase 1 可以创建/更新：

```text
README.md
```

至少说明：

```text
项目介绍
技术栈
安装
环境变量
开发
构建
```

完整题库同步机制等后续 Phase 再完善。

---

# 80. Phase 1 Build Gate

Phase 1 必须执行：

```powershell
pnpm build
```

---

必须：

```text
0 TypeScript errors
```

---

不能：

```text
module not found
```

---

不能：

```text
CSS error
```

---

不能：

```text
alias error
```

---

不能：

```text
shadcn error
```

---

不能：

```text
Vite error
```

---

# 81. Phase 1 Lint Gate

必须执行：

```powershell
pnpm lint
```

---

如果 lint 失败：

# STOP

先修复。

---

不要：

```text
eslint-disable
```

逃避错误。

---

# 82. Phase 1 Dev Gate

必须执行：

```powershell
pnpm dev
```

---

确认：

```text
localhost
```

可以打开。

---

如果 Dev Server 需要用户手动确认浏览器：

告诉用户。

---

# 83. 不要自动进入下一 Phase

这是最高优先级流程之一。

完成：

```text
Phase 1
```

之后：

# 必须停止。

---

即使你已经知道 Phase 2 应该怎么做：

# 也不能开始。

---

必须等待我明确输入：

```text
继续
```

---

只有我说：

# 继续

才可以进入：

```text
Phase 2
```

---

# 84. Phase 开发协议

每个 Phase 都必须：

```text
CHECK
↓
PLAN
↓
IMPLEMENT
↓
LINT
↓
BUILD
↓
REPORT
↓
STOP
```

---

# 85. Phase 开始前

必须先告诉我：

```text
本 Phase 目标
```

---

然后：

```text
需要创建的文件
```

---

然后：

```text
需要修改的文件
```

---

然后执行开发。

---

# 86. 如果需要用户执行命令

必须明确：

```text
请在 English2 根目录执行：
```

然后：

```powershell
pnpm ...
```

---

不能让我猜：

```text
在哪里执行？
```

---

尤其 Windows 环境：

必须明确当前目录。

---

# 87. 文件输出规则

如果需要创建：

```text
src/types/exam.ts
```

必须写：

```text
文件：

src/types/exam.ts
```

然后提供：

# 完整代码

---

不要：

```ts
// ...
```

---

不要：

```text
其余代码省略
```

---

不要：

```text
保持原样
```

---

必须可以直接复制。

---

# 88. 修改文件规则

如果修改：

```text
src/App.tsx
```

原则上提供：

# 完整修改后的文件

---

不要只说：

```text
在第 10 行添加
```

---

除非修改极其简单。

---

# 89. 不要一次输出整个项目

即使你知道最终架构：

也必须：

```text
Phase 1
```

只做 Phase 1。

---

然后：

```text
STOP
```

---

# 90. Build 失败处理

如果：

```text
pnpm build
```

失败：

必须：

```text
STOP
↓
分析错误
↓
修复
↓
pnpm build
```

---

直到：

```text
BUILD SUCCESS
```

---

不得：

```text
带错误进入下一 Phase
```

---

# 91. TypeScript Error Gate

如果出现：

```text
TS2322
TS2345
TS2352
TS6133
TS2307
```

或者其他 TypeScript error：

必须解决。

---

禁止：

```ts
as any
```

---

禁止：

```ts
@ts-ignore
```

---

# 92. ESLint / Lint Error Gate

如果：

```text
pnpm lint
```

出现错误：

必须解决。

---

如果 warning 不影响：

必须报告 warning。

---

不要因为 warning：

```text
大规模重构
```

---

# 93. Error Handling 原则

禁止：

```ts
catch {}
```

吞掉错误。

---

Service 层负责：

```text
获取数据
转换错误
抛出合理错误
```

---

UI 负责：

```text
展示错误
```

---

不要把巨大底层 error object 直接显示给用户。

---

# 94. 当前 Supabase 数据库

Supabase 已经存在。

项目：

```text
https://btrgtbhiheosntzfjhxh.supabase.co
```

数据库已经建立。

---

当前已经存在并测试成功：

```text
sync_exam_paper
```

RPC。

---

# 95. Supabase 数据库保护

绝对禁止：

```sql
DROP TABLE
```

---

禁止：

```sql
DROP FUNCTION
```

---

禁止：

```text
重新设计数据库
```

---

禁止：

```text
重新创建 sync_exam_paper
```

---

禁止：

```text
为了前端方便擅自修改数据库结构
```

---

如果未来确实需要数据库变化：

# 必须先告诉我。

---

# 96. Supabase RPC 保护

不要擅自修改：

```text
sync_exam_paper
```

---

不要猜 RPC 参数。

---

必须根据当前实际 RPC 定义和已经验证过的接口使用。

---

# 97. Supabase 权限错误

如果出现：

```text
permission denied
```

例如：

```text
permission denied for table exam_papers
```

---

不要擅自修改：

```text
RLS
permissions
policies
database
```

---

必须告诉我：

```text
错误
SQL
需要的权限
```

---

# 98. 正式同步方式

题库同步必须使用：

```text
GitHub Raw
↓
SHA-256
↓
JSON.parse
↓
validation
↓
Supabase RPC
```

---

禁止：

```text
邮箱密码登录
```

作为同步机制。

---

# 99. 不允许写死 Supabase 登录

禁止：

```ts
supabase.auth.signInWithPassword({
  email: "...",
  password: "..."
})
```

作为正式同步方式。

---

同步必须：

```text
RPC
+
RLS
+
publishable key
```

---

# 100. GitHub Token

当前 GitHub 仓库是公开仓库。

因此：

```ts
fetch(rawGithubUrl)
```

即可。

---

不要 GitHub Token。

---

# 101. Sync Hash

同步时必须：

```text
response.text()
```

先获取原始文本。

---

然后：

```text
SHA-256(rawText)
```

---

然后：

```text
JSON.parse(rawText)
```

---

禁止：

```text
JSON.parse()
↓
JSON.stringify()
↓
SHA-256()
```

---

因为：

```text
原始 JSON
```

和：

```text
重新 stringify JSON
```

可能不同。

---

# 102. Sync source_file

真实 GitHub source path：

```text
data/exams/papers-2010.json
```

---

RPC：

```text
p_source_file
```

必须：

```text
data/exams/papers-2010.json
```

---

禁止：

```text
content/exams/papers-2010.json
```

---

# 103. source_id

从：

```text
papers-2010.json
```

得到：

```text
papers-2010
```

例如：

```ts
filename.replace(/\.json$/, '')
```

---

# 104. year

从：

```text
papers-2010
```

提取：

```text
2010
```

使用：

```regex
(\d{4})$
```

---

# 105. title

生成：

```text
2010年真题
```

---

# 106. EXAM_FILES

Phase 15 再建立。

第一阶段同步范围：

```text
papers-2010.json
```

---

代码应该容易扩展：

```ts
const EXAM_FILES = [
  "papers-2010.json",
]
```

未来：

```ts
const EXAM_FILES = [
  "papers-2010.json",
  "papers-2011.json",
  "papers-2012.json",
]
```

---

# 107. SyncResult

同步服务最终应该有明确类型，例如：

```ts
interface SyncResult {
  success: boolean
  status: "imported" | "unchanged"
  source_id: string
  paper_id: string
  version: number
  sections_count: number
  items_count: number
  options_count: number
}
```

---

但：

# 必须根据实际 RPC 返回结构确认。

---

不能：

```ts
as any
```

强制转换。

---

# 108. Exam Type System

Phase 3 才建立。

文件：

```text
src/types/exam.ts
```

---

必须检查真实：

```text
data/exams/papers-2010.json
```

---

然后建立：

```text
ExamSection
ReadingSection
ClozeSection
MatchSection
TranslationSection
WritingSection
```

---

具体字段：

# 必须来自真实 JSON。

---

# 109. ChoiceQuestion

可能类似：

```ts
interface ChoiceQuestion {
  q: string
  opts: string[]
  ans: number
  explain?: string
}
```

---

但：

# 不能提前假设。

---

# 110. Database Types

建立：

```text
src/types/database.ts
```

---

用于：

```text
Supabase database rows
```

---

前端学习模型：

```text
src/types/exam.ts
```

---

数据库模型：

```text
src/types/database.ts
```

---

# 111. Adapter

如果：

```text
Supabase
```

数据结构与：

```text
GitHub JSON
```

不同：

建立 adapter。

---

例如：

```text
mapDatabasePaperToExam()
```

---

UI 不直接理解数据库内部字段。

---

# 112. Service

建立：

```text
src/services/examService.ts
```

负责：

```ts
getExamPapers()
getExamPaper(paperId)
```

---

页面不要大量：

```ts
supabase.from(...)
```

---

数据流：

```text
Page
↓
Hook
↓
Service
↓
Supabase
```

---

# 113. TanStack Query Hooks

建立：

```text
src/hooks/useExamList.ts
src/hooks/useExam.ts
```

---

负责：

```text
loading
error
cache
refetch
```

---

不要手写大量：

```text
useEffect
loading
error
data
```

如果 TanStack Query 可以解决：

# 优先使用 TanStack Query。

---

# 114. Query Keys

统一：

```ts
export const examKeys = {
  all: ["exams"] as const,
  lists: () => [...examKeys.all, "list"] as const,
  detail: (paperId: string) =>
    [...examKeys.all, "detail", paperId] as const,
}
```

---

避免：

```text
页面里到处手写 query key
```

---

# 115. Router 最终结构

最终：

```text
/
```

首页。

```text
/exams
```

题库。

```text
/exams/:paperId
```

试卷。

```text
/study
```

学习。

```text
/settings
```

设置。

```text
/*
```

404。

---

# 116. AppLayout

最终：

```text
src/layouts/AppLayout.tsx
```

---

PC：

```text
Sidebar
+
Content
```

---

手机：

```text
TopBar
+
Content
+
BottomNavigation
```

---

导航：

```text
首页
真题
学习
设置
```

---

当前路由明显高亮。

---

# 117. HomePage

最终首页：

```text
英语真题
```

副标题：

```text
每天进步一点。
```

---

今日学习：

```text
继续学习

2010 年真题
阅读理解 · Text 1

已完成 2 / 5

[继续学习]
```

---

没有学习记录：

```text
开始第一次学习
```

---

历年真题：

```text
历年真题
```

按钮：

```text
查看全部 →
```

---

不能硬编码年份。

---

# 118. Study Statistics

最终：

```text
已完成
12
```

```text
已做题
126
```

```text
正确率
78%
```

---

如果没有真实数据：

不得伪造。

---

显示：

```text
开始学习后这里会显示统计
```

---

# 119. Exam List

路由：

```text
/exams
```

---

标题：

```text
历年真题
```

---

搜索：

```text
搜索年份
```

---

筛选：

```text
全部
已完成
未完成
```

---

年份必须：

# 从 Supabase 获取。

---

禁止：

```text
硬编码年份
```

---

# 120. Exam Card

最终：

```text
2010 年真题

阅读理解
完形填空
新题型
翻译
写作

总分 100

[开始练习]
```

---

具体内容：

必须根据真实数据库。

---

# 121. Exam Page

最终：

```text
/exams/:paperId
```

---

顶部：

```text
2010 年真题

总分 100
预计时间 60 分钟
```

---

章节：

```text
阅读理解
完形填空
新题型
翻译
小作文
大作文
```

---

# 122. 阅读理解

第一阶段后续最重要 UI。

PC：

```text
文章
+
题目
```

---

文章和题目可以独立滚动。

---

手机：

```text
文章
↓
第 1 题
↓
第 2 题
↓
第 3 题
```

---

手机禁止双栏。

---

# 123. Article Reading

最大宽度：

```text
760px
```

---

PC：

```text
padding: 32px
```

---

手机：

```text
padding: 20px
```

---

英文：

```text
18px
line-height: 1.8
```

---

段落之间明显留白。

---

# 124. Answer State

至少：

```ts
interface AnswerState {
  questionId: string
  selectedAnswer: number | null
}
```

---

整个试卷维护：

```text
answers
```

---

# 125. 做题期间隐藏答案

非常重要。

题库内部可能存在：

```text
ans
explain
```

---

但做题过程中：

# 绝对不能显示。

---

不得：

```text
Answer: D
```

---

不得：

```text
正确答案
```

---

不得：

```text
解析
```

---

不得：

```text
绿色正确
红色错误
```

---

# 126. 不通过 CSS 隐藏答案

禁止：

```css
display: none
```

然后仍然渲染答案。

---

正确：

```tsx
{submitted && <AnswerExplanation />}
```

---

答案是否渲染：

必须由：

```text
submitted
```

控制。

---

# 127. Question Navigation

PC：

```text
题目导航
```

---

例如：

```text
1 2 3 4 5
```

---

状态：

```text
未答
```

灰色。

---

```text
已答
```

蓝色。

---

```text
当前
```

突出。

---

# 128. Submit

底部：

```text
已完成 3 / 5

[提交答案]
```

---

如果未全部回答：

```text
还有 2 道题没有回答。

确定提交吗？
```

---

按钮：

```text
继续检查
提交
```

---

使用：

```text
shadcn/ui
+
Base UI
```

---

# 129. Submit Result

提交后：

```text
本次得分

8 / 10

正确率 80%
```

---

逐题：

```text
你的答案：B

正确答案：D

解析：
...
```

---

正确：

```text
绿色
```

---

错误：

```text
红色
```

---

但是颜色必须克制。

---

# 130. Cloze

不要简单做成：

```text
20 个普通选择题
```

---

优先：

# 连续阅读体验。

---

例如：

```text
The outbreak of swine flu ...
was declared a global epidemic __(1)__
by the World Health Organization...
```

---

显示：

```text
(1)
```

---

然后：

```text
A
B
C
D
```

---

# 131. 新题型

必须支持真实 JSON 中存在的新题型。

---

如果：

```text
T
F
```

可以：

```text
Statement 1

...

[T] [F]
```

---

提交后：

```text
正确答案
解析
```

---

# 132. Translation

显示：

```text
Translate the following text into Chinese.
```

---

英文原文。

---

下面：

```text
我的翻译
```

---

textarea。

---

按钮：

```text
查看参考译文
```

---

点击后才显示：

```text
参考译文
```

---

第一阶段：

# 不做 AI 批改。

---

# 133. 小作文

显示：

```text
小作文
```

---

显示：

```text
prompt
```

---

textarea。

---

字数：

```text
字数：123
```

---

保存。

---

第一阶段：

可以：

```text
localStorage
```

---

# 134. 大作文

同样：

```text
大作文
```

---

显示：

```text
prompt
```

---

textarea。

---

字数统计。

---

# 135. Chart

如果真实 JSON：

```text
chart === true
```

显示图表。

---

如果没有真实图表：

禁止伪造。

---

显示：

```text
图表暂未提供
```

---

# 136. Settings

最终：

```text
/settings
```

---

包含：

```text
题库同步
```

---

题库来源：

```text
GitHub

data/exams/
```

---

最后同步：

```text
时间
```

---

按钮：

```text
同步题库
```

---

# 137. Sync UI

点击：

```text
同步题库
```

---

显示：

```text
正在连接 GitHub...
```

然后：

```text
正在检查题库...
```

然后：

```text
正在同步...
```

---

成功：

```text
题库已经是最新版本
```

或者：

```text
题库同步成功

2010 年真题
版本：2
```

---

# 138. Sync Error

GitHub 404：

```text
找不到题库文件。
```

---

网络错误：

```text
无法连接 GitHub，请检查网络。
```

---

JSON 错误：

```text
题库文件格式错误。
```

---

Supabase：

```text
题库同步失败：

具体错误信息
```

---

开发环境 console：

可以保留详细错误。

---

UI：

不要显示巨大 error object。

---

# 139. Loading

不要最终 UI：

```text
Loading...
```

---

优先：

```text
Skeleton
```

---

保持布局稳定。

---

# 140. Empty State

如果没有题库：

```text
还没有同步题库

题库由 GitHub 管理。

前往设置同步题库。

[同步题库]
```

---

# 141. Error State

如果查询失败：

```text
题库加载失败

请稍后重试。

[重新加载]
```

---

# 142. Mobile Navigation

最终：

```text
┌────────────────────────────┐
│                            │
│          内容              │
│                            │
├────────────────────────────┤
│ 首页 │ 真题 │ 学习 │ 设置 │
└────────────────────────────┘
```

---

考虑：

```text
safe-area
```

---

# 143. PC Navigation

最终：

```text
┌────────┬────────────────────┐
│        │                    │
│ 首页   │                    │
│ 真题   │       内容         │
│ 学习   │                    │
│ 设置   │                    │
│        │                    │
└────────┴────────────────────┘
```

---

# 144. Card 使用原则

不要过度使用 Card。

---

不要：

```text
每个段落一个 Card
```

---

不要：

```text
每道题一个巨大 Card
```

---

不要：

```text
每个按钮一个 Card
```

---

优先：

```text
typography
spacing
divider
subtle border
```

---

# 145. localStorage

第一阶段学习状态使用：

```text
localStorage
```

---

保存：

```text
当前做到哪一题
已选择答案
是否完成
```

---

localStorage：

# 不是数据库。

---

只是：

```text
临时客户端学习状态
```

---

题库：

# 必须 Supabase。

---

# 146. 不使用 Redux

第一阶段：

禁止：

```text
Redux
```

---

禁止：

```text
Zustand
```

---

优先：

```text
React State
React Context
TanStack Query
localStorage
```

---

# 147. React 性能

不要过早优化。

---

但是：

文章和题目较长时：

避免每次点击答案导致整个页面大范围无意义重渲染。

---

合理拆分：

```text
Question
QuestionOption
Article
ExamResult
```

---

# 148. 不提前做虚拟列表

当前题库规模不大。

禁止为了炫技引入：

```text
virtualized list
```

---

除非未来真的需要。

---

# 149. 不提前做 PWA

Phase 1：

禁止：

```text
PWA
Service Worker
Offline Cache
```

---

未来再做。

---

# 150. 不提前做 AI

Phase 1：

绝对禁止：

```text
OpenAI
Claude
Gemini
DeepSeek
```

---

以后再做。

---

# 151. 不提前做用户系统

Phase 1 禁止：

```text
注册
登录
OAuth
验证码
找回密码
```

---

未来：

```text
Supabase Auth
```

---

# 152. 不提前支付

禁止：

```text
Stripe
支付宝
微信支付
```

---

# 153. 不提前后台

禁止：

```text
Admin
CMS
后台管理系统
```

---

GitHub JSON：

# 就是内容管理方式。

---

# 154. 未来用户系统

未来：

```text
Supabase Auth
↓
user_id
↓
study_records
```

---

未来：

```text
mistakes
favorites
writing_records
```

---

但：

# 当前全部不实现。

---

# 155. README

最终 README 包含：

```text
项目介绍
技术栈
安装
环境变量
开发
构建
题库同步机制
目录结构
```

---

---

# 156. Phase 总规划

必须严格：

```text
Phase 1
↓
等待“继续”
↓
Phase 2
↓
等待“继续”
↓
Phase 3
↓
等待“继续”
...
```

---

# 157. Phase 1

目标：

# 项目初始化

包括：

```text
React
TypeScript
Vite
Tailwind CSS 4
shadcn/ui
Base UI
React Router
Supabase client
TanStack Query
React Hook Form
Zod
Lucide React
clsx
tailwind-merge
class-variance-authority
date-fns
@shadcn/lint
```

---

# 158. Phase 1 Step 1

检查当前目录：

```powershell
Get-Location
```

---

确认：

```text
English2/
```

---

确认：

```text
data/exams/papers-2010.json
```

存在。

---

# 159. Phase 1 Step 2

检查：

```powershell
node -v
pnpm -v
```

---

# 160. Phase 1 Step 3

检查：

```text
package.json
vite.config.*
src/
```

---

不要假设。

---

# 161. Phase 1 Step 4

如果没有前端项目：

从：

```text
English2/
```

根目录初始化：

```text
Vite
React
TypeScript
```

---

# 162. Phase 1 Step 5

安装：

```text
tailwindcss
@tailwindcss/vite
```

---

# 163. Phase 1 Step 6

配置：

```text
@/*
```

---

确保：

```text
TypeScript
Vite
```

都认识。

---

# 164. Phase 1 Step 7

检查 shadcn CLI：

```powershell
pnpm dlx shadcn@latest init --help
```

---

然后根据当前版本初始化：

```text
shadcn/ui
+
Base UI
```

---

不要猜参数。

---

# 165. Phase 1 Step 8

检查：

```text
components.json
src/lib/utils.ts
```

---

检查：

```text
Tailwind
CSS
theme
alias
Base UI
```

---

# 166. Phase 1 Step 9

安装：

```text
react-router-dom
@supabase/supabase-js
@tanstack/react-query
react-hook-form
zod
lucide-react
clsx
tailwind-merge
class-variance-authority
date-fns
```

---

如果某些已经存在：

不要重复安装。

---

# 167. Phase 1 Step 10

创建：

```text
.env.example
```

内容：

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

---

如果：

```text
.env.local
```

已经存在：

不要覆盖。

---

如果没有真实 key：

不要创建虚假 `.env.local`。

---

# 168. Phase 1 Step 11

更新：

```text
.gitignore
```

确保忽略：

```text
node_modules/
dist/
.env
.env.local
.env.*.local
```

---

确保没有忽略：

```text
data/
```

---

# 169. Phase 1 Step 12

建立最小：

```text
src/
```

目录。

---

至少：

```text
src/
├── components/
│   └── ui/
├── lib/
├── pages/
├── router/
├── services/
├── App.tsx
├── main.tsx
└── index.css
```

---

不要创建：

```text
exam/
question/
study/
layout/
hooks/
types/
```

等大量空目录，除非 Phase 1 真正需要。

---

# 170. Phase 1 Step 13

建立：

```text
HomePage.tsx
```

---

显示：

```text
英语真题

每天进步一点。

项目初始化成功。
```

---

必须使用：

```text
Tailwind
shadcn Button
```

---

# 171. Phase 1 Step 14

建立 React Router：

```text
/
```

---

打开：

```text
HomePage
```

---

# 172. Phase 1 Step 15

建立：

```text
QueryClient
```

---

通过：

```text
QueryClientProvider
```

包裹 React。

---

暂时不请求 Supabase。

---

# 173. Phase 1 Step 16

可以建立：

```text
src/services/supabase.ts
```

---

使用：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

---

只验证：

```text
createClient
```

可以编译。

---

不执行实际查询。

---

# 174. Phase 1 Step 17

安装：

```text
button
card
```

---

例如：

```powershell
pnpm dlx shadcn@latest add button card
```

---

如果当前 CLI 语法不同：

先检查帮助。

---

# 175. Phase 1 Step 18

首页使用：

```text
Button
```

---

验证：

```text
shadcn/ui
+
Base UI
+
Tailwind
```

---

# 176. Phase 1 Step 19

阅读官方：

```text
@shadcn/lint SETUP.md
```

---

然后：

```text
安装
注册
配置
```

---

必须：

```text
不启用新的 @shadcn/lint rules
```

---

# 177. Phase 1 Step 20

执行：

```powershell
pnpm lint
```

---

必须成功。

---

# 178. Phase 1 Step 21

执行：

```powershell
pnpm dev
```

---

确认：

```text
localhost
```

可以打开。

---

# 179. Phase 1 Step 22

执行：

```powershell
pnpm build
```

---

必须：

```text
BUILD SUCCESS
```

---

# 180. Phase 1 Step 23

再次确认：

```text
data/exams/papers-2010.json
```

仍然存在。

---

不能：

```text
删除
移动
重命名
覆盖
```

---

# 181. Phase 1 禁止进入 Phase 2

即使：

```text
Phase 1
```

已经成功：

也必须：

# STOP

---

等待用户：

```text
继续
```

---

# 182. Phase 2

只有用户说：

```text
继续
```

才能开始。

---

目标：

```text
Supabase 基础连接
```

---

建立：

```text
src/services/supabase.ts
```

---

验证：

```text
Supabase
```

连接。

---

完成后：

```text
pnpm lint
pnpm build
```

---

然后：

# STOP

---

# 183. Phase 3

目标：

```text
真实题库类型系统
```

---

必须检查：

```text
data/exams/papers-2010.json
```

---

建立：

```text
src/types/exam.ts
src/types/database.ts
```

---

不要猜字段。

---

完成：

```text
pnpm lint
pnpm build
```

---

然后：

# STOP

---

# 184. Phase 4

目标：

```text
examService
```

---

建立：

```text
getExamPapers()
getExamPaper()
```

---

连接：

```text
Supabase
```

---

完成：

```text
pnpm lint
pnpm build
```

---

然后：

# STOP

---

# 185. Phase 5

建立：

```text
useExamList()
useExam()
```

---

使用：

```text
TanStack Query
```

---

完成：

```text
pnpm lint
pnpm build
```

---

然后：

# STOP

---

# 186. Phase 6

建立：

```text
AppLayout
DesktopSidebar
MobileNav
```

---

完成：

```text
pnpm lint
pnpm build
```

---

然后：

# STOP

---

# 187. Phase 7

建立：

```text
HomePage
```

---

实现：

```text
继续学习
历年真题
学习统计
```

---

完成：

```text
pnpm lint
pnpm build
```

---

然后：

# STOP

---

# 188. Phase 8

建立：

```text
ExamListPage
```

---

完成：

```text
pnpm lint
pnpm build
```

---

然后：

# STOP

---

# 189. Phase 9

建立：

```text
ExamPage
```

---

完成：

```text
pnpm lint
pnpm build
```

---

然后：

# STOP

---

# 190. Phase 10

重点：

```text
ReadingSection
ReadingQuestion
QuestionOption
ExamSubmitBar
ExamResult
```

---

实现：

```text
文章
题目
选项
答题状态
提交
结果
解析
```

---

完成：

```text
pnpm lint
pnpm build
```

---

然后：

# STOP

---

# 191. Phase 11

实现：

```text
完形填空
```

---

完成：

```text
pnpm lint
pnpm build
```

---

然后：

# STOP

---

# 192. Phase 12

实现：

```text
新题型
```

---

完成：

```text
pnpm lint
pnpm build
```

---

然后：

# STOP

---

# 193. Phase 13

实现：

```text
翻译
```

---

完成：

```text
pnpm lint
pnpm build
```

---

然后：

# STOP

---

# 194. Phase 14

实现：

```text
小作文
大作文
```

---

完成：

```text
pnpm lint
pnpm build
```

---

然后：

# STOP

---

# 195. Phase 15

实现：

```text
SettingsPage
questionBankSync.ts
```

---

完整：

```text
GitHub
↓
raw text
↓
SHA-256
↓
JSON.parse
↓
validation
↓
RPC
```

---

RPC：

```ts
supabase.rpc("sync_exam_paper", {
  p_source_id,
  p_source_file,
  p_content_hash,
  p_year,
  p_title,
  p_source_json,
})
```

---

完成：

```text
pnpm lint
pnpm build
```

---

然后：

# STOP

---

# 196. Phase 16

实现：

```text
localStorage
```

保存：

```text
学习进度
答题状态
完成状态
```

---

完成：

```text
pnpm lint
pnpm build
```

---

然后：

# STOP

---

# 197. Phase 17

整体 UI：

```text
PC
手机
阅读体验
Loading
Empty
Error
Dark mode
Accessibility
```

---

完成：

```text
pnpm lint
pnpm build
```

---

然后：

# STOP

---

# 198. 每个 Phase 的固定报告

完成每个 Phase 后必须报告：

```text
Phase X 完成
```

---

然后：

```text
本 Phase 目标：
...
```

---

```text
安装依赖：
...
```

---

```text
创建文件：
...
```

---

```text
修改文件：
...
```

---

```text
删除文件：
...
```

如果没有：

```text
删除文件：
无
```

---

然后：

```text
当前目录：
...
```

---

然后：

```text
pnpm lint：
SUCCESS / FAILED
```

---

然后：

```text
pnpm build：
SUCCESS / FAILED
```

---

如果 Phase 有：

```text
warning
```

必须说明。

---

最后：

# 等待“继续”

---

# 199. Build Gate

任何 Phase：

如果：

```text
pnpm build
```

失败：

不能完成 Phase。

---

必须：

```text
修复
↓
重新 build
```

---

直到：

```text
BUILD SUCCESS
```

---

# 200. Lint Gate

任何 Phase：

如果：

```text
pnpm lint
```

失败：

必须分析：

```text
configuration error
```

还是：

```text
actual lint finding
```

---

修复之后：

```text
pnpm lint
```

---

然后：

```text
pnpm build
```

---

# 201. STOP Gate

每个 Phase：

必须：

```text
开发
↓
lint
↓
build
↓
报告
↓
STOP
```

---

没有：

```text
继续
```

不得：

```text
下一 Phase
```

---

# 202. 未来功能

未来可以加入：

```text
用户登录
学习记录
错题本
收藏
单词收藏
阅读生词
作文 AI 批改
AI 解析
学习统计
连续学习天数
```

---

但是：

# 当前 Phase 不提前实现。

---

# 203. 最终产品结构

最终：

```text
首页
│
├── 继续学习
├── 历年真题
└── 学习统计
```

---

```text
真题
│
├── 2010
├── 2011
├── 2012
└── ...
```

---

```text
试卷
│
├── 阅读理解
├── 完形填空
├── 新题型
├── 翻译
├── 小作文
└── 大作文
```

---

```text
学习
│
├── 最近学习
├── 完成记录
└── 统计
```

---

```text
设置
│
├── 题库同步
├── 外观
└── 关于
```

---

# 204. 最终架构

必须保持：

```text
                     GitHub
                       │
                       │ JSON
                       ↓
              GitHub Raw 文件
                       │
                       ↓
             React 同步题库服务
                       │
                 SHA-256 Hash
                       │
                       ↓
                Supabase RPC
                       │
                       ↓
             Supabase Database
                       │
                       ↓
                  React App
                       │
             ┌─────────┴─────────┐
             ↓                   ↓
          题库浏览             在线做题
             │                   │
             └─────────┬─────────┘
                       ↓
                   学习记录
```

---

# 205. 最终职责

## GitHub

```text
Source of Truth
```

---

## Supabase

```text
Runtime Database
```

---

## React

```text
Learning Client
```

---

# 206. 最终安全原则

绝对不能：

```text
service_role key
```

进入前端。

---

绝对不能：

```text
database password
```

进入前端。

---

绝对不能：

```text
GitHub Token
```

进入前端。

---

绝对不能：

```text
真实密码
```

写入代码。

---

# 207. 最终代码质量原则

代码必须：

```text
TypeScript strict
```

---

优先：

```text
明确类型
```

---

禁止：

```text
any
as any
@ts-ignore
```

---

组件：

# 不要巨大。

---

例如：

禁止：

```text
ExamPage.tsx
```

超过合理范围后继续堆代码。

---

应该拆成：

```text
ExamHeader
ExamSectionNav
ReadingSection
ReadingQuestion
QuestionOption
ExamSubmitBar
ExamResult
```

---

# 208. Service 原则

页面：

# 不应该直接操作数据库。

---

推荐：

```text
Page
↓
Hook
↓
Service
↓
Supabase
```

---

# 209. Adapter 原则

推荐：

```text
Database
↓
Adapter
↓
Exam Model
↓
UI
```

---

UI 不应该知道：

```text
Supabase table implementation details
```

---

# 210. UI 原则

不要：

```text
大量 Card
```

---

不要：

```text
大量颜色
```

---

不要：

```text
复杂动画
```

---

不要：

```text
企业后台风格
```

---

优先：

```text
阅读
留白
层次
Typography
```

---

# 211. 用户体验原则

最终整个流程应该：

```text
打开网站
↓
首页
↓
继续学习
↓
阅读文章
↓
回答问题
↓
下一题
↓
提交
↓
8 / 10
↓
查看答案
↓
查看解析
```

---

必须：

# 顺畅。

---

# 212. 最终开发原则

牢记：

```text
不要猜
```

---

如果：

```text
JSON 不确定
```

先检查。

---

如果：

```text
Supabase RPC 不确定
```

先检查。

---

如果：

```text
shadcn CLI 参数不确定
```

先：

```powershell
pnpm dlx shadcn@latest --help
```

---

如果：

```text
@shadcn/lint 配置不确定
```

先阅读官方：

[@shadcn/lint SETUP.md](https://github.com/shadcn-ui/lint/blob/main/SETUP.md?utm_source=chatgpt.com)

---

如果：

```text
Tailwind 版本行为不确定
```

不要照搬旧版 v3 教程。

---

如果：

```text
Supabase 权限出现问题
```

不要擅自修改数据库。

---

# 213. 最终 Phase 规则

整个项目始终遵守：

```text
Phase 1
↓
开发
↓
pnpm lint
↓
pnpm build
↓
报告
↓
STOP
```

---

用户输入：

```text
继续
```

之后：

```text
Phase 2
↓
开发
↓
pnpm lint
↓
pnpm build
↓
报告
↓
STOP
```

---

以此类推。

---

# 214. 最重要的 STOP 条件

以下任何一种情况发生：

```text
当前目录不正确
```

或者：

```text
data/exams/papers-2010.json 不存在
```

或者：

```text
Node / pnpm 环境不满足要求
```

或者：

```text
shadcn CLI 参数不确定
```

或者：

```text
Supabase 数据库结构不确定
```

或者：

```text
RPC 参数不确定
```

或者：

```text
pnpm lint 失败
```

或者：

```text
pnpm build 失败
```

或者：

```text
出现无法安全判断的环境问题
```

必须：

# STOP

告诉我问题。

不要猜。

不要偷偷修改。

不要进入下一阶段。

---

# 215. Phase 1 当前任务

现在：

# 只执行 Phase 1。

第一步：

检查当前工作目录。

---

然后：

```text
确认 English2 根目录
```

---

然后：

```text
确认 data/exams/papers-2010.json
```

---

然后：

```powershell
node -v
pnpm -v
```

---

然后检查：

```text
package.json
vite.config.*
src/
```

---

根据检查结果：

从当前：

```text
English2/
```

根目录初始化：

```text
React
+
TypeScript
+
Vite
```

---

然后配置：

```text
Tailwind CSS 4
+
shadcn/ui
+
Base UI
```

---

然后：

# 必须阅读并按照当前官方文档配置 @shadcn/lint。

官方：

[@shadcn/lint SETUP.md](https://github.com/shadcn-ui/lint/blob/main/SETUP.md?utm_source=chatgpt.com)

---

然后安装：

```text
React Router
Supabase
TanStack Query
React Hook Form
Zod
Lucide React
clsx
tailwind-merge
class-variance-authority
date-fns
```

---

然后：

```text
.env.example
.gitignore
```

---

然后：

```text
最小 src/
```

---

然后：

```text
HomePage
```

显示：

```text
英语真题

每天进步一点。

项目初始化成功。
```

---

使用：

```text
React
Tailwind
shadcn Button
```

---

然后：

```text
React Router
```

至少支持：

```text
/
```

---

然后：

```text
TanStack Query Provider
```

---

然后：

```text
Supabase client
```

只完成：

```text
环境变量
+
createClient
```

编译验证。

---

不要查询数据库。

---

然后：

```text
pnpm dev
```

---

然后：

```text
pnpm lint
```

---

然后：

```text
pnpm build
```

---

确认：

```text
data/exams/papers-2010.json
```

仍然存在。

---

# 216. Phase 1 禁止事项再次确认

Phase 1：

绝对不要开始：

```text
题库同步
Supabase RPC
题库列表
试卷
做题
阅读理解
完形填空
新题型
翻译
作文
学习记录
错题
统计
AI
登录
支付
后台
PWA
```

---

# 217. Phase 1 最终输出

完成后必须告诉我：

```text
Phase 1 完成
```

---

## 安装依赖

完整列出。

---

## 创建文件

完整列出。

---

## 修改文件

完整列出。

---

## 删除文件

如果没有：

```text
无
```

---

## 当前目录结构

完整列出关键目录。

---

## 启动

```powershell
pnpm dev
```

---

## Lint

```powershell
pnpm lint
```

结果：

```text
SUCCESS / FAILED
```

---

## Build

```powershell
pnpm build
```

结果：

```text
SUCCESS / FAILED
```

---

## GitHub 题库

确认：

```text
data/exams/papers-2010.json
```

仍然存在。

---

## @shadcn/lint

说明：

```text
是否安装
修改了哪些配置
pnpm lint 是否成功
是否启用了新的 rules
```

---

## 最终状态

必须明确：

```text
BUILD SUCCESS
```

或者：

```text
BUILD FAILED
```

---

# 218. 最终停止指令

Phase 1 完成后：

# 必须停止。

不要：

```text
自动开始 Phase 2
```

不要：

```text
顺便实现 Supabase
```

不要：

```text
顺便检查数据库
```

不要：

```text
顺便实现题库
```

不要：

```text
顺便实现首页完整功能
```

---

必须等待我输入：

# 「继续」

---

# 219. 最终最高优先级总结

始终牢记：

```text
Windows 11 64-bit
```

```text
English2 = 当前 Git 根目录
```

```text
不要 English2/English2
```

```text
不要 git init
```

```text
pnpm only
```

```text
React
```

```text
Vite
```

```text
TypeScript strict
```

```text
Tailwind CSS 4
```

```text
shadcn/ui
```

```text
Base UI
```

```text
不要 Radix
```

```text
@shadcn/lint
```

```text
先阅读官方 SETUP.md
```

```text
不擅自启用新的 @shadcn/lint rules
```

```text
Supabase
```

```text
React Router
```

```text
TanStack Query
```

```text
React Hook Form
```

```text
Zod
```

```text
Lucide React
```

```text
GitHub = Source of Truth
```

```text
Supabase = Runtime Database
```

```text
React = Learning Client
```

```text
data/exams/ = GitHub source directory
```

```text
papers-2010.json = 不得删除/移动/重命名
```

```text
正常学习：
Supabase → React
```

```text
同步：
GitHub → SHA-256 → Supabase RPC
```

```text
localStorage = 临时学习状态
```

```text
不要 AI
```

```text
不要登录
```

```text
不要支付
```

```text
不要后台
```

```text
不要 PWA
```

```text
不要过度工程化
```

```text
不要 any
```

```text
不要 as any
```

```text
不要 @ts-ignore
```

```text
每个 Phase 必须 lint
```

```text
每个 Phase 必须 build
```

```text
build 失败必须修复
```

```text
lint 失败必须修复
```

```text
没有“继续”不得进入下一 Phase
```

# Phase 1 → STOP

# Phase 2 → STOP

# Phase 3 → STOP

# Phase 4 → STOP

……

# 永远按照 Phase Gate 执行。

[1]: https://github.com/shadcn-ui/lint/blob/main/SETUP.md "lint/SETUP.md at main · shadcn-ui/lint · GitHub"
