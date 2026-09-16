# Phase 5：在线练习

**状态：** `done`
**上位文档：** [Phases README](./README.md)、`docs/architecture.md`

---

## 1. Phase 目标

让用户能在某个大题里真正做题：能选、能翻页、能保存、关掉再进来还能接着做。

本阶段**不判分、不显示答案**（那是 Phase 6）。它只解决"答题动作被可靠地记下来"。

---

## 2. 用户价值

```text
进入某大题 → 逐题作答 → 选择被保存 → 上一题 / 下一题 → 中途退出 → 下次进来自动恢复到上次位置
```

---

## 3. 包含范围

- 练习会话创建 / 恢复 / 进度保存 / 暂停
- 选择题作答与 upsert 保存
- 已保存答案回填（刷新后选项仍高亮）
- 主观题（翻译 / 写作）的占位说明

---

## 4. 不包含范围

- 判分与对错判定
- 显示正确答案 / 解析
- 主观题在线作答与提交
- 计时 / 限时
- 错题、历史、统计
- 整套卷考试模式

---

## 5. 功能目标

| Goal | 内容 | 状态 |
| --- | --- | --- |
| 5.1 | service 层提供会话创建 / 读取 / 恢复 / 进度更新 / 答案 upsert | 完成 |
| 5.2 | 进入练习时：有可恢复会话则恢复，否则创建一次（不重复创建） | 完成 |
| 5.3 | 选择题可点选，选择即时保存，`UNIQUE(session_id, item_id)` 保证不重复 | 完成 |
| 5.4 | 上一题 / 下一题，边界按钮禁用，进度写入 `current_item_no` | 完成 |
| 5.5 | 刷新后恢复到上次题号，已选选项回填高亮 | 完成 |
| 5.6 | 「暂停并退出」把会话置 `paused` 并返回试卷详情 | 完成 |
| 5.7 | 保存中状态可见（"保存中…"） | 完成 |
| 5.8 | 主观题显示"暂不支持在线提交答案"，不显示任何参考答案 | 完成 |
| 5.9 | `practice_answers.is_correct` / `score` 不写入、不回读 | 完成 |

---

## 6. 涉及页面

- [练习页](../pages/practice.md)
- [真题详情](../pages/exam-detail.md)（"开始练习"入口）

---

## 7. 涉及数据

```text
practice_sessions   id, user_id, session_type, status, section_id, paper_id,
                    current_item_no, elapsed_seconds, time_limit_seconds,
                    started_at, paused_at, completed_at
practice_answers    id, session_id, item_id, selected_option, text_answer,
                    time_spent_seconds, answered_at
```

约束要点：

- `session_type`：`practice` | `exam` | `mistake`；`practice` 会话带 `section_id`
- `status`：`active` | `paused` | `completed` | `abandoned`
- **数据库不保证"一个用户同时只有一个 active 会话"**，恢复时取 `updated_at` 最新的一条
- `is_correct` / `score` 字段存在但本阶段不写不读
- RLS：仅本人可见；service 层仍显式 `.eq('user_id', uid)` 做纵深防御

---

## 8. 涉及代码区域

```text
src/services/practice.ts              会话与答案 API、PracticeError、错误归一化
src/hooks/use-practice-session.ts     读取 hooks
src/hooks/use-practice-mutations.ts   写入 hooks
src/pages/PracticePage.tsx
src/components/practice/PracticeQuestion.tsx
src/lib/constants.ts                  practiceKeys
```

---

## 9. 技术约束

- 数据链路 `Page → Hook → Service → Supabase`，页面不得直接 `supabase.from(...)`
- 本阶段禁止读取题库答案列来"顺手判分"
- 错误文案由 `PracticeError` / `toPracticeErrorMessage` 归一化，页面不解析底层错误
- 会话恢复逻辑不得伪造"最多一个 active 会话"的业务规则

---

## 10. 验收标准

- 从详情页点「开始练习」进入 `/exams/:paperId/practice/:sectionId`
- 选择题可点选，Network 中可见 upsert 请求，刷新后选项仍高亮
- 「下一题」推进，进度写入；刷新后回到上次题号
- 第一题时「上一题」禁用；最后一题显示"本大题已到最后一题"
- 「暂停并退出」回到详情页，再进入仍能恢复
- 翻译 / 写作大题显示占位说明，页面无任何参考答案
- 响应体与 DOM 中不含 `is_correct` / `score` / `correct_option`
- `pnpm build` / `pnpm lint` 通过，浏览器 console 无 error

---

## 11. 完成定义

见 [Phases README §7](./README.md#7-完成定义)。

---

## 12. 后续 Phase

[Phase 6：答案、判分与解析](./phase-06-answer-review.md) —— 当前最关键的缺口：
用户做完题不知道对错。
