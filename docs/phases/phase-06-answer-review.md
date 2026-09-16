# Phase 6：答案、判分与解析

**状态：** `in-progress` —— Goal 6.0–6.4 **全部完成并通过验证**（6.3 已按「离线作答标记」方案收口）
**判分通路已选定：** 方案 A（服务端判分 RPC），决策记录见 [`docs/development/decisions.md`](../development/decisions.md)
**当前实现：** RPC `public.grade_practice_section(uuid)` + [`PracticeResult.tsx`](../pages/practice.md)；进度见 [`progress.md`](../development/progress.md)
**上位文档：** [Phases README](./README.md)、`docs/architecture.md` §28–§31、`docs/AGENTS.md` §19

---

## 1. Phase 目标

让用户在做完题之后知道：**哪题对了、哪题错了、正确答案是什么、为什么**。

这是从"真题阅读器"变成"学习工具"的分水岭。
在此之前（Phase 5）用户能做题但不知道对错，学习闭环是断的。

---

## 2. 用户价值

```text
完成一个大题的作答
    ↓
提交
    ↓
看到结果：做对几题 / 做错几题
    ↓
逐题看到：我选的 / 正确答案 / 解析
    ↓
理解为什么错
```

---

## 3. 包含范围

- 客观题（选择题）判分与结果展示
- 正确答案与解析的受控展示
- 翻译题参考答案的展示策略
- 练习结果的完成态（会话置 `completed`）

> **6.3 的收口口径（2026-09-16）**：翻译题采用「**离线作答 + 在线标记**」——
> 用户在草稿纸上完成翻译，回页面点「标记已完成作答」，提交后由判分 RPC 下发参考译文。
> 这一做法**不采集任何在线文本输入**，因此与 §4「不包含主观题在线输入提交」不冲突；
> 标记行只是"这题我做过了"的占位，`text_answer` 写空串。详见 Goal 6.3。

---

## 4. 不包含范围

- 错题本收录（见 [Phase 7](./phase-07-learning-loop.md)）
- 学习历史与统计
- 整套卷限时考试模式
- 写作自动评分
- 主观题在线输入提交

---

## 5. 功能目标

> Goal 顺序即建议执行顺序。**6.0 必须先完成并通过验证，否则不要开始 6.1。**

### Goal 6.0 — 确定答案与判分的数据通路 ✅ 已完成

**决策（2026-09-16）：采用方案 A —— 服务端判分 RPC（SECURITY DEFINER），
用户提交整个大题时批量判分一次。**

完整决策记录（Context / Reason / Consequence / 实施约束）见
[`docs/development/decisions.md`](../development/decisions.md) 中
「判分通路采用服务端判分 RPC（方案 A）」。

**为什么否决 B（放宽列级权限）：**
HTTP 无状态，数据库无法判断"是否已提交"，GRANT 放开后任意 authenticated 可随时拖走全部
816 题答案；且 RLS 只管行不管列，无法做列级条件，没有任何补救手段。

**为什么否决 C（Edge Function）：**
效果等同 A，但要多维护一套 Deno 运行时，对个人 / 家庭项目是纯负担。

**实施时的六条硬约束**（写 RPC 前必读 decisions.md 对应条目）：

1. 必须校验 `ps.user_id = auth.uid()` —— 否则是提权漏洞
2. 必须 `set search_path = public, pg_temp`
3. `is_correct` 由服务端写回，前端不回写
4. 只判 `item_type = 'choice'`，主观题返回 `null`
5. 翻译题参考答案 `extra_data.reference_translation` 走同一 RPC 返回
6. 需要 `GRANT EXECUTE ... TO authenticated`

> **概念澄清**：安全目标不是"用户永远看不到答案"（提交后看到正确答案正是学习闭环的核心），
> 而是"不能在未作答的情况下批量获取全库答案"。

**关联豁免**：用户已决定不写 migration、不做 SQL 备份，RPC 直接在线上库创建。

### Goal 6.1 — 客观题判分 ✅ 已完成

- 用户提交一个大题的作答后，逐题得到对错结果
- 结果写入 `practice_answers.is_correct`（由 RPC 服务端写回，前端不回写）
- 会话状态推进到 `completed`（并补 `completed_at`）

**落地：** RPC `public.grade_practice_section(p_session_id uuid)`（SECURITY DEFINER）
+ `gradePracticeSection()` + `useGradePracticeSection()`。

### Goal 6.2 — 结果展示 ✅ 已完成

- 结果区展示：已作答数、做对题数、做错题数、**正确率**
- 逐题展示：用户选择、正确答案、解析（若有）
- 解析缺失时给明确文案（「本题暂无解析。」），不显示空白
- 未作答的题**不出现在结果里**，并明确提示「未作答 N 题，不参与判分，也不会显示答案。」

**落地：** `src/components/practice/PracticeResult.tsx`（纯展示、不发请求）
+ `PracticePage.tsx` 结果视图。

### Goal 6.3 — 翻译题参考答案 ✅ 已完成

- 翻译题的参考答案（`section_items.extra_data.reference_translation`）在用户提交后展示
- **收口方案：「离线作答 + 在线标记」**（2026-09-16）
  - 练习页对翻译题渲染「标记已完成作答」按钮（`aria-pressed` 表达状态）
  - 标记 = 写一条 `practice_answers` 行，`text_answer = ''`、`selected_option = null`。
    **不采集任何在线文本输入**，因此不触碰 §4 的红线
  - 取消标记 = **真删**该行（`deletePracticeAnswer`）。只改本地 state 不够 ——
    行还在的话，撤销后提交依然会看到参考译文
  - 提交后由判分 RPC（唯一答案出口）下发 `reference_translation`，`PracticeResult` 渲染
- **为什么必须走提交**：`section_items.extra_data` 对 `authenticated` 已 REVOKE，
  前端拿不到"这题有没有参考内容"；RPC 又只返回**本次会话实际作答过**的题。
  所以「标记 → 提交」是拿到参考译文的**唯一受控通路**，而不是绕过判分的旁路
- **写作题不走这条路**：范文 `sample` 只存在于 2024 / 2025 的 4 个大题，
  且放在**公开可读**的 `exam_sections.extra_data` 里，详情页已有「参考范文」折叠。
  练习页对写作题只给如实说明、**不渲染提交按钮**（否则是永不可用的假入口）

**落地：**
```text
src/pages/PracticePage.tsx                  标记/撤销 + answeredCount 修正 + canSubmit 分流
src/components/practice/PracticeQuestion.tsx  isTextAnswered / onToggleTextAnswer（未传则不渲染按钮）
src/services/practice.ts                     deletePracticeAnswer()
src/hooks/use-practice-mutations.ts          useDeletePracticeAnswer()
```

> ⚠️ **`answeredCount` 不能用 `savedByItem.size`**：主观题写的是 `text_answer`，
> `selected_option` 恒为 `null`，按选项集合计数会让翻译大题（只有 1 小题）永远停在 0，
> 提交按钮永远点不动。现按「本题选过选项 **或** 标记过完成」逐题判定。
>
> ⚠️ **`canSubmit = hasChoiceItems || canRevealReference`**：
> 写作题两者皆无 → 不渲染提交。曾误用 `!hasChoiceItems`（把一切非选择题当翻译题），
> 导致写作题出现一个点了没用的提交按钮。

### Goal 6.4 — 写作题处理 ✅ 已完成

- 写作题不判分：`correct_option` 为 `null` → RPC 返回 `is_correct = null`
  → 结果里标「主观题」，文案「主观题不判分，可对照参考内容自查。」
- 未新增自动评分

---

## 6. 涉及页面

- [练习页](../pages/practice.md)（新增结果态）
- 结果展示**沿用练习页页内结果态**（同一路由，已实现；未新增独立页面）

---

## 7. 涉及数据

```text
读取（受控，由 6.0 决策决定通路）
  section_items.correct_option        0-based 正确答案下标
  section_items.explanation           解析
  section_items.extra_data            翻译题含 reference_translation

写入（全部由 RPC 服务端完成，前端不回写）
  practice_answers.is_correct         对错结果
  practice_sessions.status            → completed
  practice_sessions.completed_at

写入（由前端写，但只写「标记」不写答案内容 —— Goal 6.3）
  practice_answers.text_answer        翻译题标记行写空串 ''（离线作答的占位），
                                      撤销标记时整行 DELETE

未写入（保留但暂不使用）
  practice_answers.score              判分不产生分数，只有对错
  practice_answers.time_spent_seconds 有列但未写入
```

> `practice_answers` **没有** `selected_option` / `text_answer` 二选一的 CHECK 约束，
> 因此 `selected_option = null, text_answer = ''` 这种"纯标记行"是合法数据。

已有
  practice_sessions / practice_answers  见 Phase 5
```

边界要求（不可回退）：

- 答案列**不得**回到 `src/services/exams.ts` 的常规查询白名单
- 判分通路与题库浏览通路必须分离

---

## 8. 涉及代码区域

实际落地（2026-09-16）：

```text
线上库（无 migration，用户已豁免）   public.grade_practice_section(uuid)
src/services/practice.ts             PracticeGradeResult + gradePracticeSection() + deletePracticeAnswer()
src/hooks/use-practice-mutations.ts  useGradePracticeSection() + useDeletePracticeAnswer()
src/types/database.ts                Functions 增加 grade_practice_section（`pnpm db:types` codegen）
src/pages/PracticePage.tsx           提交动作 + 结果视图 + 「正在判分…」态 + 翻译题标记/撤销
src/components/practice/PracticeResult.tsx   结果渲染（纯展示）
src/components/practice/PracticeQuestion.tsx 主观题标记按钮（未传回调则不渲染）
```

> `src/types/database.ts` 是**纯 codegen 产物**（`pnpm db:types`）。codegen 会把
> `RETURNS TABLE` 的列一律推成非空，所以「列可为 null」这一事实在
> **service 的 DTO 层**用 `?? null` 收口（`toGradeResult` 逐字段重建），
> **不要**手改 `database.ts` 加 `| null` —— 下次 codegen 会覆盖掉。

> ⚠️ 本项目**不再存在 migration 工作流**（用户已删除 `supabase/migrations/`）。
> 线上数据库变更直接执行，因此每次执行前必须摊开 SQL 给用户确认，跑完立即读回线上状态核对。

---

## 9. 技术约束

- 遵守 `docs/architecture.md` §31 Answer Boundary：不为前端方便无条件暴露答案
- 遵守 `docs/architecture.md` §32：不为了每个字段创建 View / RPC，只有真实业务需要才建 —— 判分属于真实需要
- 遵守 `docs/AGENTS.md` §19：不自行设计第二套答案系统，按当前项目答案访问架构扩展
- 涉及数据库结构 / 权限变化：**本项目已无 migration 工作流**（用户 2026-09-16 豁免并删除
  `supabase/migrations/`）。变更直接在线上执行，顺序为 **线上 SQL → 读回核对 → service → 前端 → 浏览器验证**
- 破坏性操作必须用户确认

---

## 10. 验收标准

- 完成一个大题作答后可提交，得到逐题对错
- 结果中能同时看到"我的选择"与"正确答案"
- 有解析的题目展示解析；无解析的题目有明确文案
- 翻译题提交后能看到参考译文；**作答过程中看不到**（含"点标记之前"）
- 写作题**没有**提交入口，只给如实说明（范文在试卷详情页）
- 会话置为 `completed`，再次进入不再恢复到作答中状态
- **作答过程（未提交）的 Network 响应中不含 `correct_option` / `explanation` / `reference_translation`**
- `pnpm build` / `pnpm lint` / TypeScript 通过
- 浏览器验证：桌面 + 移动端，console 无 error

**6.3 附加验收（2026-09-16 已实测通过）：**

- 翻译题点「标记已完成作答」→ 发 POST 落库 → 「已作答 1 题」→ 提交按钮解禁
- 取消标记 → 发 **DELETE**（真删行）→ 计数回落、提交按钮重新禁用
- 提交后参考译文渲染（实测 327 字符，与 `extra_data.reference_translation` 一致）
- 写作题：如实说明文案 + 提交按钮计数 **0**
- 选择题回归：正确率仍为 `round(1/3*100) = 33%`

---

## 11. 完成定义

见 [Phases README §7](./README.md#7-完成定义)。

额外要求：本 Phase 涉及答案边界，**必须在验收时重新确认 Phase 2 的边界未被破坏**。

---

## 12. 后续 Phase

[Phase 7：学习记录、错题与复习](./phase-07-learning-loop.md)
