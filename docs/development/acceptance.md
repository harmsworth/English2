# 通用验收标准

**适用：** 所有 Phase 与 Goal
**上位文档：** `docs/AGENTS.md` §44–§51

---

## 1. 使用方式

**不要机械全跑。** 按任务性质选择适用项，并在 Phase 文档或任务记录里写清"本次不验证什么、为什么"。

例如：

| 任务性质 | 至少验证 |
| --- | --- |
| 纯文案 / 样式微调 | Build + 浏览器 |
| 页面功能 | Functional + UI + Responsive + Browser + Build |
| Service / 数据层 | TypeScript + Data + Security Boundary + Browser |
| 数据库 / 权限变更 | Data + Security Boundary + 全链路浏览器回归 |

---

## 2. Functional（功能）

- [ ] 页面可访问，URL 正确
- [ ] 核心交互按预期工作（点击 / 提交 / 跳转 / 返回）
- [ ] 数据正确：条数、顺序、内容
- [ ] 写入类操作结果可回读验证
- [ ] 边界情况：空数据、非法参数、重复操作

---

## 3. UI（界面状态）

四态齐全，缺一不可：

- [ ] **loading** — 骨架或占位，不是空白
- [ ] **success** — 正常渲染
- [ ] **empty** — 有明确提示文案，不是空白
- [ ] **error** — 有明确提示 + 可重试（若可重试）

其他按需：

- [ ] disabled — 边界按钮禁用
- [ ] selected — 选中态可见
- [ ] submitting / saving — 进行中状态可见
- [ ] completed — 完成态有明确收尾

---

## 4. Responsive（响应式）

- [ ] Desktop（≥1280px）
- [ ] Mobile（≤375px）

要求：无横向溢出、无元素重叠、主要 CTA 可见可点。

---

## 5. TypeScript

```bash
pnpm build        # 内含 tsc -b
```

- [ ] 通过，无错误
- [ ] 未使用 `any` / `as any` / `@ts-ignore` 掩盖真实类型错误
- [ ] 新增类型来自真实 schema，不是手写猜测

---

## 6. Lint

```bash
pnpm lint         # oxlint
```

- [ ] 通过
- [ ] 未通过关闭规则的方式绕过

---

## 7. Build

```bash
pnpm build
```

- [ ] 生产构建通过
- [ ] 构建产物无敏感信息（不出现 service_role / 数据库密码）

---

## 8. Browser（浏览器验证）

涉及页面的任务**必须做**，不能跳过。

- [ ] 目标页面能打开
- [ ] URL 与路由一致
- [ ] 核心数据显示正确
- [ ] 核心交互可用
- [ ] **console error = 0**
- [ ] **page error = 0**
- [ ] 无异常 4xx / 5xx

---

## 9. Data（数据正确性）

- [ ] 数据源正确（题库走 Supabase，不走 `data/exams/*.json`）
- [ ] 查询使用显式列白名单，无 `*`
- [ ] 排序契约满足：sections 按 `sort_order`、items 按 `item_no`、options 按 `option_index`
- [ ] 若涉及数据库变更：已写 migration、已应用到目标环境、已验证实际库状态

---

## 10. Security Boundary（安全边界）

**每次涉及题库或答案数据时必须复验，防止回退：**

- [ ] 响应体中不含 `correct_option` / `explanation` / `source_data` / `passage_zh`
- [ ] 响应体中不含 `practice_answers.is_correct` / `score`（判分实现前）
- [ ] 翻译题参考译文不出现在响应体与 DOM
- [ ] 前端代码中无 `service_role` / 数据库密码 / 任何绕过 RLS 的凭据
- [ ] `.env.local` 未被提交

---

## 11. Git Diff

```bash
git status
git diff
git diff --check
```

- [ ] 只修改了本任务相关文件
- [ ] 无意外修改
- [ ] 无格式问题（trailing whitespace 等）
- [ ] **用户已有的未提交修改未被覆盖**
- [ ] 未 commit、未 push（除非用户明确要求）

---

## 12. 不通过时的处理

```text
失败 → 定位原因 → 修复 → 重新验证
```

禁止：

- 删除或跳过验证步骤
- 修改预期让验证"通过"
- 关闭 lint / TypeScript
- 声称未执行的验证为已通过（`docs/AGENTS.md` §50）
