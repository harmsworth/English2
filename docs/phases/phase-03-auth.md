# Phase 3：用户身份与访问入口

**状态：** `done`
**上位文档：** [Phases README](./README.md)、`docs/architecture.md`

---

## 1. Phase 目标

让 English2 能识别"当前是谁在学习"，并把未登录访问挡在应用外。

产品是个人 / 家庭使用，因此用户系统的目标只有一个：
**识别学习用户并保存其学习数据**（见 `00-product-requirements.md` §17）。

---

## 2. 用户价值

- 用户用邮箱 + 密码登录后才能进入学习页面；
- 学习数据（练习会话、作答）归属于本人；
- 退出登录后回到登录页。

---

## 3. 包含范围

- Supabase Auth 邮箱密码登录
- `AuthProvider` / `useAuth`
- `ProtectedRoute` 包裹应用路由
- `LoginPage`

---

## 4. 不包含范围

- 注册流程
- 找回密码 / 修改密码
- 第三方登录
- 多用户 / 组织 / RBAC / 多租户
- 用户资料页

以上均无当前产品需求，不要提前实现。

---

## 5. 功能目标

| Goal | 内容 | 状态 |
| --- | --- | --- |
| 3.1 | 未登录访问 `/` `/exams` `/exams/:paperId` `/exams/:paperId/practice/:sectionId` 时跳转 `/login` | 完成 |
| 3.2 | 登录成功后进入 `/` | 完成 |
| 3.3 | 已登录访问 `/login` 自动跳转 `/` | 完成 |
| 3.4 | 登录失败显示中文错误，不暴露底层细节 | 完成 |
| 3.5 | 提供退出登录入口 | 完成 |
| 3.6 | 学习数据写入时携带并校验当前用户 | 完成（见 Phase 5 service 层显式 `user_id` 过滤） |

---

## 6. 涉及页面

- [登录页](../pages/login.md)
- [首页](../pages/home.md)

---

## 7. 涉及数据

- 认证由 Supabase Auth 管理，不自建用户表
- 学习数据表通过 `user_id` 归属：`practice_sessions.user_id`、`practice_answers`（经 session 归属）、`mistakes.user_id`、`mistake_reviews.user_id`
- RLS：学习数据表限 `auth.uid() = user_id`；题库表 `authenticated` 仅 SELECT

---

## 8. 涉及代码区域

```text
src/providers/auth-provider.tsx
src/providers/auth-context.ts
src/hooks/use-auth.ts
src/services/auth.ts
src/components/protected-route.tsx
src/pages/LoginPage.tsx
src/router/index.tsx        路由分组：/login 公开，其余包 ProtectedRoute
```

---

## 9. 技术约束

- 认证调用只在 Service / Provider 层，Page 不直接 `supabase.auth.*`（见 `.codebuddy/rules/architecture.md`）
- 前端只允许 `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`，禁止任何 service_role / 数据库密码（见 `docs/AGENTS.md` §18）
- 不要为两个用户设计商业 SaaS 级权限体系（见 `00-product-requirements.md` §18）

---

## 10. 验收标准

- 未登录直接访问 `/exams` → 落在 `/login`
- 正确账号登录 → 进入 `/`，可继续跳 `/exams`
- 错误密码 → 显示中文失败提示，不出现 `Invalid login credentials` 之类的原始文案
- 已登录访问 `/login` → 自动回 `/`
- 退出登录 → 回 `/login`，再访问 `/exams` 被挡
- 浏览器 console 无 page error

---

## 11. 完成定义

见 [Phases README §7](./README.md#7-完成定义)。

---

## 12. 后续 Phase

[Phase 4：真题浏览](./phase-04-exam-browse.md)
