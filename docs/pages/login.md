# 登录页（LoginPage）

**路由：** `/login`
**文件：** `src/pages/LoginPage.tsx`
**所属 Phase：** [Phase 3](../phases/phase-03-auth.md)

---

## 1. 页面目的

用邮箱 + 密码完成登录，是进入 English2 的唯一入口。

---

## 2. 用户进入方式

- 未登录访问任意受保护路由 → 自动重定向到 `/login`
- 直接访问 `/login`

已登录用户访问 `/login` 会自动重定向到 `/`。

---

## 3. 用户可以做什么

- 输入邮箱与密码
- 提交登录
- 看到表单校验与登录失败的中文提示

---

## 4. 页面信息结构

```text
┌────────────────────────────┐
│ 考研英语二 · 真题学习       │
│ 请使用邮箱和密码登录。      │
│                            │
│ 邮箱                       │
│ [ you@example.com        ] │
│                            │
│ 密码                       │
│ [ **********             ] │
│                            │
│ [        登 录         ]   │
└────────────────────────────┘
```

---

## 5. 页面状态

| 状态 | 表现 |
| --- | --- |
| loading | 会话恢复期间不渲染表单 |
| submitting | 按钮禁用，文案变「登录中…」 |
| success | 重定向到 `/` |
| error | 表单内红色文案：邮箱/密码校验错误，或整表错误 |
| env 缺失 | 显示"尚未配置 Supabase 环境变量，请检查 .env.local。" |

---

## 6. 用户操作

| 操作 | 结果 |
| --- | --- |
| 提交空邮箱 | 「请输入邮箱。」 |
| 提交格式错误邮箱 | 「邮箱格式不正确。」 |
| 提交空密码 | 「请输入密码。」 |
| 提交错误凭据 | service 归一化后的中文错误，不出现 `Invalid login credentials` |
| 登录成功 | 进入 `/` |

---

## 7. 数据来源

```text
LoginPage
  ↓ useAuth()（src/hooks/use-auth.ts）
  ↓ src/services/auth.ts
  ↓ Supabase Auth
```

本页不查询任何业务表。

---

## 8. 数据展示规则

- 展示：表单、校验与错误文案
- 不展示：用户列表、任何其他账号信息、任何题库数据
- 开发环境可用 `.env.local` 的 `VITE_DEV_LOGIN_EMAIL` / `VITE_DEV_LOGIN_PASSWORD` 预填，**仅 DEV 生效**

---

## 9. 路由

```text
/login    公开路由
```

---

## 10. 组件

```text
src/components/ui/button.tsx
src/components/ui/card.tsx
src/components/ui/input.tsx
src/hooks/use-auth.ts
src/services/supabase.ts   isSupabaseConfigured
```

表单用 `react-hook-form` + `zod` 技术栈已引入，本页用 `react-hook-form` 的 `register` 校验。

---

## 11. 响应式要求

- **desktop**：卡片居中，最大宽 `max-w-md`
- **mobile**：卡片宽度自适应，内边距保留；输入框不溢出

---

## 12. 验收标准

- 未登录访问 `/exams` → 落在 `/login`
- 空表单提交 → 两个字段都有中文校验提示
- 错误密码 → 中文失败提示，无原始英文错误
- 正确账号 → 进入 `/`
- 已登录访问 `/login` → 自动回 `/`
- 375px 下表单可用，无横向滚动
- console 无 error

---

## 13. 当前状态

`stable`
