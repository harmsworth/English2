---
description: English2 分层架构与目录约定（Page → Hook → Service → Supabase）
alwaysApply: true
---

# Architecture Rules

## 分层调用链

数据访问必须严格遵循单向依赖：

```text
Page
  ↓
Hook
  ↓
Service
  ↓
Supabase
```

## 硬性禁止

Page / Component 中不允许直接调用：

```ts
supabase.from(...)
supabase.rpc(...)
supabase.auth.*
```

不允许在 Page 中内联写查询逻辑、错误重试、loading 状态机。

## 各层职责

### Service（`src/services/`）

- 唯一允许 import Supabase client 并访问数据库的层
- 负责：表/视图查询、`rpc` 调用、结果映射、错误归一化
- 导出纯函数，不导出 React 相关内容
- 不允许出现 `useQuery` / `useMutation`

### Hook（`src/hooks/`）

- 唯一允许使用 TanStack Query 的层
- 负责：queryKey、staleTime、缓存、重试、loading/error 状态暴露
- 调用 Service，不直接访问 Supabase
- queryKey 必须统一走 `src/lib/constants.ts` 中的 `examKeys`

### Page（`src/pages/`）

- 只消费 Hook 返回的数据与状态
- 只负责布局与交互
- 不感知数据来源

## 目录约定

```text
src/
  components/    通用组件 + shadcn/ui 组件
  hooks/         React Query hooks
  lib/           utils / constants / 纯工具
  pages/         路由页面
  services/      Supabase 数据访问
  types/         生成的 database.ts + 领域类型
```

## 复用优先

新增能力前，先检查是否已有：

- Supabase client（`src/services/supabase.ts`）
- QueryClient（`src/main.tsx`）
- router（`src/main.tsx` / `src/App.tsx`）
- queryKey 工厂（`examKeys`）
- `cn()`（`src/lib/utils.ts`）

不要因为外部示例不同就复制一份新实现。
