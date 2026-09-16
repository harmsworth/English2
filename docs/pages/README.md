# Pages 说明

**目录：** `docs/pages/`
**上位文档：** `docs/00-product-requirements.md`、`docs/architecture.md`、`docs/phases/`

---

## 1. 这个目录回答什么问题

> **这个页面应该怎么用？上面有什么？各种状态下长什么样？**

Page 文档描述的是**页面产品行为**，不是代码实现说明。

它不描述：
- 组件怎么拆
- state 怎么命名
- 查询怎么写
- 样式用什么 class

它描述：
- 用户在这个页面要完成什么
- 页面必须提供哪些信息
- 每种状态下用户看到什么
- 数据从哪来、什么不能展示

---

## 2. 与 Phase 文档的关系

```text
Phase 文档：这一阶段交付什么能力
     ↓ 落到页面
Page 文档：这个页面应该怎么工作（长期有效，不随 Phase 反复重写）
```

同一个页面可能被多个 Phase 修改（先能看 → 再能做 → 再能判分）。
**Page 文档描述页面的目标状态**，当前实现状态写在每个文档的「当前状态」一节。

---

## 3. 页面清单

| 文档 | 页面 | 路由 |
| --- | --- | --- |
| [home.md](./home.md) | HomePage | `/` |
| [login.md](./login.md) | LoginPage | `/login` |
| [exams.md](./exams.md) | ExamListPage | `/exams` |
| [exam-detail.md](./exam-detail.md) | ExamDetailPage | `/exams/:paperId` |
| [practice.md](./practice.md) | PracticePage | `/exams/:paperId/practice/:sectionId` |
| [not-found.md](./not-found.md) | NotFoundPage | `*` |

> 路由参数统一为 `:paperId`（试卷 id，不是年份）。
> `00-product-requirements.md` / `architecture.md` / `AGENTS.md` 已同步为同一写法。

---

## 4. 状态枚举

每个 Page 文档的「当前状态」使用以下取值：

| 值 | 含义 |
| --- | --- |
| `planned` | 尚未实现 |
| `in-progress` | 正在实现 |
| `needs-polish` | 功能可用，但体验 / 边界态有缺口 |
| `stable` | 功能完整，无已知缺口 |
| `done` | 随所属 Phase 一并验收完成 |

---

## 5. 通用要求（所有页面）

1. **四态齐全**：loading / success / empty / error，缺一不可（`docs/AGENTS.md` §25）
2. **错误文案人话**：页面只渲染 service 层归一化后的中文句子
3. **不直连数据库**：Page → Hook → Service → Supabase
4. **响应式**：至少 desktop 与 mobile 两档
5. **不泄漏内部字段**：见每个文档的「数据展示规则」
