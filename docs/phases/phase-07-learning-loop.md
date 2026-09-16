# Phase 7：学习记录、错题与复习

**状态：** `planned`（未授权执行）
**上位文档：** [Phases README](./README.md)、`00-product-requirements.md` §13–§16

---

## 1. Phase 目标

让用户做过的事留得下来：知道做过什么、错了哪些、能回到错题重做。

本 Phase 依赖 Phase 6 判分结果 —— 没有对错判定就无法生成错题。

---

## 2. 用户价值

```text
做完题 → 错题自动进错题本 → 我的错题 → 重做 → 标记已掌握 → 以后还能找到
```

---

## 3. 包含范围

- 练习历史：做过哪些 Paper / Section / 时间 / 正确率
- 错题：基于判分结果自动收录
- 错题重做
- 标记已掌握

---

## 4. 不包含范围

- 学习统计图表（正确率趋势、连续学习天数等）
- 个性化推荐 / 学习计划
- 间隔重复算法（SM-2 等）
- 收藏

`00-product-requirements.md` §16 明确：统计必须建立在真实学习行为数据之上，不提前设计没有数据支撑的图表。

---

## 5. 功能目标

> 具体 Goal 在本 Phase 授权执行时再细化。以下只锁定范围与依赖。

- 7.1 基于判分结果生成错题记录（`mistakes` 表已存在）
- 7.2 「我的错题」列表页
- 7.3 错题重做，复习记录进 `mistake_reviews`
- 7.4 标记已掌握 / 移出错题本
- 7.5 学习历史列表（最近做过什么）

---

## 6. 涉及页面

尚无页面文档 —— 本 Phase 的页面（错题列表 / 错题重做 / 历史）需要在授权后新建 `docs/pages/mistakes.md` 等。

---

## 7. 涉及数据

```text
mistakes          id, user_id, item_id, status, first_wrong_at, last_wrong_at,
                  review_count, consecutive_correct, mastered_at, removed_at
mistake_reviews   id, mistake_id, user_id, reviewed_at, selected_option,
                  text_answer, is_correct, score
practice_sessions / practice_answers   见 Phase 5
```

表已存在且 authenticated 已具备 DML 授权，但**尚未有任何前端代码使用**。

---

## 8. 涉及代码区域

尚无实现。授权后按现有分层新增：

```text
src/services/mistakes.ts
src/hooks/use-mistakes.ts
src/pages/MistakesPage.tsx（命名待定）
src/router/index.tsx
```

---

## 9. 技术约束

- 用户学习数据与核心题库数据分离（`docs/architecture.md` §33）
- 不要把学习行为塞进题库表
- 不为了"可能需要"提前建表和抽象（`docs/AGENTS.md` §13、§55）
- 具体数据模型在真正开始设计时确定，`docs/architecture.md` §34 明确不提前锁死

---

## 10. 验收标准

在本 Phase 授权执行时，按 [通用验收标准](../development/acceptance.md) 补充可验证条目。

---

## 11. 完成定义

见 [Phases README §7](./README.md#7-完成定义)。

---

## 12. 后续 Phase

授权后进入；完成后再评估是否启动"学习统计"与"完整考试模式"（当前未排期）。
