# English2 Project

English2 是一个面向个人 / 家庭使用的**考研英语二（英语二）系统练习 Web 应用**。

项目核心目标是围绕考研英语二历年真题，建立一个长期、系统、可追踪的英语练习系统。

核心能力包括：

* 考研英语二历年真题
* 真题分模块练习
* 阅读理解练习
* 完形填空练习
* 新题型练习
* 翻译练习
* 写作练习
* 错题管理
* 错题复习
* 完整考试模式
* 学习记录
* 学习统计
* 后续 PWA / 移动端 / 离线能力

项目重点不是简单展示题目，而是逐步建立：

```text
真题
 ↓
练习
 ↓
答题记录
 ↓
错题
 ↓
错题复习
 ↓
完整考试
 ↓
学习统计
```

形成完整的个人学习闭环。

**English2 当前不负责《新概念英语 2》的课程或教材学习系统。**

---

## Technology Stack

当前技术栈：

* React
* TypeScript
* Vite
* Tailwind CSS
* shadcn/ui
* Supabase
* TanStack Query
* React Router
* React Hook Form
* Zod
* pnpm

除非用户明确要求，不要擅自更换核心技术栈。

---

## Architecture

数据访问必须遵循：

```text
Page
  ↓
Hook
  ↓
Service
  ↓
Supabase
```

Page 不允许直接调用：

```ts
supabase.from(...)
```

数据库访问放在 Service。

React Query 相关逻辑放在 Hook。

页面消费 Hook。

---

## Phase Discipline

项目采用 Phase 渐进式开发。

当前规划：

```text
Phase 1  — Project initialization
Phase 2  — Database types and data access foundation
Phase 3  — Authentication
Phase 4  — Question-bank synchronization
Phase 5  — Historical exam practice
Phase 6  — Normal practice
Phase 7  — Mistakes
Phase 8  — Full exam mode
Phase 9  — Statistics
Phase 10 — PWA / mobile / offline
```

规则：

1. 只能实现用户当前明确授权的 Phase。
2. 不得主动跨 Phase。
3. 不得为了“顺手”实现未来功能。
4. 发现未来需求可以记录，但不要实现。
5. 当前 Phase 完成后必须停止。
6. 必须等待用户明确授权下一 Phase。

---

## Source of Truth

数据库结构：

> 实际 Supabase PostgreSQL 数据库是最终事实来源。

代码：

> 当前 Git repository 是实现状态的事实来源。

题库：

> GitHub repository 中的 `data/exams/` 是题库原始数据的 Source of Truth。

运行时数据：

> Supabase 是应用运行时数据库。

文档：

> `README.md` 和 `docs/` 是设计、约定和说明来源。

用户当前明确要求：

> 优先于 Agent 自己的猜测。

禁止凭空创造：

* 数据库表
* 字段
* 外键
* 索引
* RLS
* RPC
* API
* 类型
* 业务规则

事实不明确时，先检查实际来源。

---

## Supabase Types

TypeScript Database 类型必须优先从真实 Supabase schema 生成。

不要根据：

```text
docs/database-schema.md
```

手写一个“猜测版” `Database` 类型。

如果 Supabase CLI 因运行环境问题无法执行：

必须明确报告：

```text
BLOCKED
```

不得伪造生成结果。

---

## Security

前端绝对不能使用：

* service_role key
* database password
* secret key
* private key
* access token
* refresh token

`.env.local` 不得提交 Git。

不得在日志、聊天、截图或代码中输出真实 secret。

---

## Existing Conventions

优先复用现有项目实现。

特别是：

* 当前 Supabase client
* 当前 QueryClient
* 当前 router
* 当前 `examKeys`
* 当前 `cn()`
* 当前 shadcn/ui

不要因为网上示例不同而擅自改变项目约定。

---

## TypeScript

严格 TypeScript。

禁止未经明确授权使用：

```ts
any
```

```ts
as any
```

```ts
@ts-ignore
```

优先使用：

* generated types
* type narrowing
* type guards
* explicit types

不要通过类型断言掩盖真实类型错误。

---

## Git

修改代码前检查 Git 状态。

不得：

```text
git reset --hard
git clean -fd
force push
```

不得覆盖用户已有修改。

Commit / push 必须根据当前任务和用户明确授权执行。

---

## Validation

不能声称某个命令成功，除非实际执行并成功。

例如：

* lint
* build
* test
* type generation
* commit
* push

都必须以实际执行结果为准。
