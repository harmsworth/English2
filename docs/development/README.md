# Development 说明

**目录：** `docs/development/`
**上位文档：** `docs/AGENTS.md`、`docs/phases/`、`docs/pages/`

---

## 1. 这个目录回答什么问题

> **AI Agent 该如何推进项目？现在进行到哪了？什么算通过？为什么当初这么定？**

与产品文档的区别：

| 目录 | 回答 |
| --- | --- |
| `00-product-requirements.md` | 为什么做 / 最终做成什么 |
| `architecture.md` | 系统怎么组织 |
| `phases/` | 这一阶段完成什么 |
| `pages/` | 这个页面怎么工作 |
| **`development/`** | **AI 如何推进、如何验收、当前在哪、改过什么决定** |
| `data/` | 数据从哪来、怎么流动 |

---

## 2. 文件清单

| 文件 | 作用 | 谁读 |
| --- | --- | --- |
| [workflow.md](./workflow.md) | AI 标准开发循环 | 每次开工 |
| [progress.md](./progress.md) | **当前状态入口** | 每次开工必读 |
| [acceptance.md](./acceptance.md) | 通用验收标准 | 每次收尾 |
| [decisions.md](./decisions.md) | 重要产品 / 架构决策记录 | 做决策前后 |

---

## 3. 推荐阅读顺序

```text
1. docs/development/progress.md      当前 Phase / Goal / 阻塞
2. docs/phases/phase-XX-*.md         本阶段要做什么
3. docs/pages/*.md                   涉及页面怎么工作
4. docs/architecture.md + AGENTS.md  约束（若任务涉及边界 / 数据库）
5. 真实代码                          确认文档与代码是否一致
```

**不要跳过第 1 步。** 文档描述的是目标，progress 描述的是现状。

---

## 4. 维护纪律

- `progress.md` 是**状态文件**，不是聊天记录。只记状态、结论、阻塞，不记过程。
- `decisions.md` 只记**重大决策**，普通编码细节不写。
- `acceptance.md` 定义通用标准，具体 Phase 可裁剪，但裁剪要在 Phase 文档里写明。
- 每次 Goal 完成后更新 `progress.md`；不更新等于没完成。
