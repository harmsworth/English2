# Phase 1：基础设施与数据访问基础

**状态：** `done`
**上位文档：** [Phases README](./README.md)、`docs/architecture.md`

---

## 1. Phase 目标

建立可以长期开发的前端工程基础：类型可信、构建可用、路由清晰、数据访问有统一入口。

这一阶段不面向最终用户，但它决定后续所有阶段能不能被安全地自动化修改。

---

## 2. 用户价值

本阶段没有直接用户价值。它的价值是：

- 后续功能可以放心改，不会因为类型失真而引入隐性 Bug；
- 数据库类型来自真实 schema，不靠手写猜测；
- 所有页面共享同一套路由、Query、组件与工具约定。

---

## 3. 包含范围

- Vite + React 19 + TypeScript（strict）+ Tailwind CSS 4 + shadcn/ui（Base UI）
- Supabase 客户端与 `src/types/database.ts`（由真实 schema 生成）
- TanStack Query 与 queryKey 工厂 `src/lib/constants.ts`
- React Router 路由骨架 `src/router/index.tsx`
- Lint / build 脚本
- 路径别名 `@/*`

---

## 4. 不包含范围

- 任何真题业务页面
- 认证
- 题库同步
- 练习能力
- 性能优化（除已完成的路由级代码分割）

---

## 5. 功能目标

| Goal | 内容 | 状态 |
| --- | --- | --- |
| 1.1 | 项目可 `pnpm dev` / `pnpm build` / `pnpm lint` | 完成 |
| 1.2 | `src/types/database.ts` 由真实 Supabase schema 生成，不手写 | 完成 |
| 1.3 | Supabase client 使用生成的 `Database` 泛型 | 完成 |
| 1.4 | 路由集中在 `src/router/`，页面在 `src/pages/` | 完成 |
| 1.5 | queryKey 集中管理（`examKeys` / `practiceKeys`） | 完成 |
| 1.6 | 路由级代码分割，页面各自进入独立 chunk | 完成 |

---

## 6. 涉及页面

无业务页面。仅基础设施页面壳。

---

## 7. 涉及数据

- 无业务表读写
- `src/types/database.ts` 覆盖的真实表：`exam_papers`、`exam_sections`、`section_items`、`item_options`、`practice_sessions`、`practice_answers`、`mistakes`、`mistake_reviews`

---

## 8. 涉及代码区域

```text
package.json          脚本：dev / build(tsc -b && vite build) / lint(oxlint) / preview
tsconfig*.json        根 tsconfig 不写 baseUrl（TS6 已废弃），只写 paths
vite.config.ts        @/* 别名
src/main.tsx          QueryClient、Router 挂载
src/router/index.tsx  路由表 + 懒加载
src/lib/constants.ts  examKeys / practiceKeys
src/lib/utils.ts      cn()
src/types/database.ts 生成类型，不得手改
src/services/supabase.ts
```

---

## 9. 技术约束

- 严格 TypeScript：禁止 `any` / `as any` / `@ts-ignore`（见 `docs/AGENTS.md` §23）
- 数据库类型只能来自真实 schema，禁止按 `docs/` 文档反推（见 `docs/architecture.md` §36）
- 路径别名统一 `@/*`，禁止长相对路径
- 新增能力前先查是否已有 Service / Hook / Component / Query / Route 可复用（见 `docs/AGENTS.md` §11）

---

## 10. 验收标准

- `pnpm build` 通过（`tsc -b` 无错误）
- `pnpm lint` 通过
- `pnpm dev` 后 `/` 可访问
- 首屏无 console error / page error
- `src/types/database.ts` 与线上 schema 一致

---

## 11. 完成定义

见 [Phases README §7](./README.md#7-完成定义)。

---

## 12. 后续 Phase

[Phase 2：真题内容体系与数据边界](./phase-02-content-pipeline.md)
