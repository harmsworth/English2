# Phase 6：答案、判分与解析

**状态：** `in-progress` —— Goal 6.0 / 6.1 / 6.2 / 6.4 已完成并通过验证；Goal 6.3 挂起（与 §4 冲突，待用户决策）
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

### Goal 6.3 — 翻译题参考答案 ⚠️ 挂起（与 §4 冲突）

- 原要求：翻译题的参考答案（`section_items.extra_data.reference_translation`）在用户提交后展示
- **冲突**：本 Phase §4「不包含范围」已排除「主观题在线输入提交」，翻译题因此永远
  产生不了 `practice_answers` 行 → RPC 永远不返回它 → 参考译文区块不可达
- **现状**：RPC 已能返回 `reference_translation`，`PracticeResult` 也能渲染它，只缺触达路径

**待用户选择收口方式：**

- (a) 删除 / 重写本 Goal，把翻译参考译文归到「主观题在线作答」的后续 Phase；
- (b) 给主观题加独立入口（如「查看参考译文」，不走提交判分）—— 会扩张本 Phase 范围。

### Goal 6.4 — 写作题处理 ✅ 已完成

- 写作题不判分：`correct_option` 为 `null` → RPC 返回 `is_correct = null`
  → 结果里标「主观题」，文案「主观题不判分，可对照参考内容自查。」
- 未新增自动评分

---

## 6. 涉及页面

- [练习页](../pages/practice.md)（新增结果态）
- 结果展示可能新增页面或沿用 Practice 页内结果态 —— **由实现决定，不在本阶段预设**

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

未写入（保留但暂不使用）
  practice_answers.score              判分不产生分数，只有对错

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
src/services/practice.ts             PracticeGradeResult + gradePracticeSection()
src/hooks/use-practice-mutations.ts  useGradePracticeSection()
src/types/database.ts                Functions 增加 grade_practice_section
src/pages/PracticePage.tsx           提交动作 + 结果视图 + 「正在判分…」态
src/components/practice/PracticeResult.tsx   结果渲染（纯展示）
```

> ⚠️ 本项目**不再存在 migration 工作流**（用户已删除 `supabase/migrations/`）。
> 线上数据库变更直接执行，因此每次执行前必须摊开 SQL 给用户确认，跑完立即读回线上状态核对。

---

## 9. 技术约束

- 遵守 `docs/architecture.md` §31 Answer Boundary：不为前端方便无条件暴露答案
- 遵守 `docs/architecture.md` §32：不为了每个字段创建 View / RPC，只有真实业务需要才建 —— 判分属于真实需要
- 遵守 `docs/AGENTS.md` §19：不自行设计第二套答案系统，按当前项目答案访问架构扩展
- 涉及数据库结构 / 权限变化：先 migration，再 service，再前端，最后浏览器验证（`docs/AGENTS.md` §58）
- 破坏性操作必须用户确认

---

## 10. 验收标准

- 完成一个大题作答后可提交，得到逐题对错
- 结果中能同时看到"我的选择"与"正确答案"
- 有解析的题目展示解析；无解析的题目有明确文案
- 翻译题提交后能看到参考译文；**作答过程中看不到**
- 会话置为 `completed`，再次进入不再恢复到作答中状态
- **作答过程（未提交）的 Network 响应中不含 `correct_option` / `explanation` / `reference_translation`**
- `pnpm build` / `pnpm lint` / TypeScript 通过
- 浏览器验证：桌面 + 移动端，console 无 error

---

## 11. 完成定义

见 [Phases README §7](./README.md#7-完成定义)。

额外要求：本 Phase 涉及答案边界，**必须在验收时重新确认 Phase 2 的边界未被破坏**。

---

## 12. 后续 Phase

[Phase 7：学习记录、错题与复习](./phase-07-learning-loop.md)
