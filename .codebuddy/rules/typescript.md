---
description: English2 严格 TypeScript 规则（禁用 any / as any / @ts-ignore）
alwaysApply: true
---

# TypeScript Rules

## 严格模式

项目启用 `strict`。所有新增代码必须通过严格类型检查。

## 硬性禁止

```ts
any
as any
as unknown as X   // 除非有注释说明且不可避免
@ts-ignore
@ts-expect-error  // 仅允许带明确原因说明
```

例外：必须由用户明确要求并说明原因。

## 优先使用

- Supabase 生成的类型（`src/types/database.ts`）
- 类型收窄（type narrowing）
- 类型守卫（type guards）
- 显式返回类型
- `unknown` 代替 `any`，配合收窄使用

## 类型来源

数据库类型只能来自真实 Supabase schema 生成的 `database.ts`。

禁止：

- 手写"猜测版" `Database` 类型
- 依据 `docs/database-schema.md` 反推类型
- 凭空新增表、字段、枚举

## 路径别名

统一使用：

```ts
import { cn } from "@/lib/utils";
import { getSupabaseClient } from "@/services/supabase";
```

禁止长相对路径回退，例如：

```ts
import { cn } from "../../../lib/utils";
```

## Supabase 客户端类型

Supabase client 必须使用生成的泛型：

```ts
import type { Database } from "@/types/database";

export type TypedSupabaseClient = SupabaseClient<Database>;
```

Query 的返回类型从 Service 推导，不要手动复制粘贴字段清单。
