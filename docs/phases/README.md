# Phases 说明

**目录：** `docs/phases/`
**上位文档：** `docs/00-product-requirements.md`、`docs/architecture.md`、`docs/AGENTS.md`
**下位文档：** `docs/pages/*.md`

---

## 1. 这个目录回答什么问题

> **English2 现在处于哪个阶段？这一阶段要完成什么？什么时候算完成？**

`00-product-requirements.md` 回答"最终要做成什么"，`architecture.md` 回答"系统怎么组织"。
本目录负责把最终目标切成**一段一段可以独立交付的用户价值**。

---

## 2. Phase 是什么

Phase 是**按产品能力划分的交付单元**，不是按代码模块划分。

判断标准：

```text
这个 Phase 结束后，用户能多做一件什么事？
```

如果一个"阶段"结束后用户没有获得任何新能力，它就不是 Phase，只是重构或技术任务。

---

## 3. Phase 与产品目标的关系

```text
00-product-requirements.md（最终目标）
        ↓ 切成可交付的能力
    Phases（阶段性用户价值）
        ↓ 每个 Phase 落到具体页面
    Pages（页面产品行为）
        ↓ 实现与验证
    Development / Acceptance
        ↓
    Code → Verification → Progress
```

`00-product-requirements.md` §36 定义了产品的 8 个长期演进方向。
本目录的 Phase 划分是对它的工程化落地，不另起一套产品方向。

---

## 4. Phase 状态定义

| 状态 | 含义 |
| --- | --- |
| `planned` | 已定义目标，尚未授权执行 |
| `in-progress` | 用户已授权，正在执行 |
| `done` | 满足 [完成定义](#7-完成定义) |
| `blocked` | 执行中被外部条件卡住，原因记录在 `docs/development/progress.md` |

---

## 5. Phase 如何进入执行状态

1. 用户明确授权某个 Phase 或某个 Goal；
2. Agent 读取该 Phase 文档 + 相关 `docs/pages/*.md` + `docs/development/progress.md`；
3. Agent 检查真实代码，确认文档描述与代码是否一致；
4. 开始执行，**不因小问题中断**。

未授权的 Phase：
**只维护文档，不写代码。**

---

## 6. Phase 与 Page 文档的关系

- Phase 文档定义"这一阶段交付什么能力"；
- Page 文档定义"这个页面应该怎么工作"；
- 同一个 Page 可能被多个 Phase 反复触及（先能看、再能做、再能判分）。

Phase 文档**不重复描述页面细节**，只链接到 Page 文档。
Page 文档**不重复描述阶段目标**，只描述页面行为。

---

## 7. 完成定义

一个 Phase 只有在以下全部满足后才能标记 `done`：

```text
需求完成（Phase 文档中所有 Goal 已实现）
+
代码完成（无 TODO 占位、无半成品分支）
+
验证完成（TypeScript / Lint / Build / 浏览器，见 development/acceptance.md）
+
已知问题修复或明确记录为 Known Issue
+
Git Diff 检查完成（只改了本 Phase 相关文件）
```

代码写完但验证没过，不算完成。
详见 `docs/AGENTS.md` §44–§45。

---

## 8. 路线图总表

| # | Phase | 用户价值 | 状态 |
| --- | --- | --- | --- |
| 1 | [基础设施与数据访问基础](./phase-01-foundation.md) | 项目能跑、类型可信 | `done` |
| 2 | [真题内容体系与数据边界](./phase-02-content-pipeline.md) | 17 套真题进库且答案不泄漏 | `done` |
| 3 | [用户身份与访问入口](./phase-03-auth.md) | 只有本人能进本人学习数据 | `done` |
| 4 | [真题浏览](./phase-04-exam-browse.md) | 能找到并看清任意一年的真题 | `done` |
| 5 | [在线练习](./phase-05-practice.md) | 能做题、能保存、能断点恢复 | `done` |
| 6 | [答案、判分与解析](./phase-06-answer-review.md) | 做完知道对错、知道为什么 | `in-progress` ← 当前 |
| 7 | [学习记录、错题与复习](./phase-07-learning-loop.md) | 错题留得下、找得到、能重做 | `planned` |

**未排期方向**（产品需求中提到但当前无足够细节，暂不建独立文档）：

- 完整考试模式（限时整套作答）
- 学习统计（正确率 / 完成度 / 连续学习）
- PWA / 移动端增强 / 离线

这些方向在启动前需要先补充产品决策，再新建 Phase 文档。

---

## 9. 当前状态入口

**AI Agent 每次开始工作前，先读 `docs/development/progress.md` 获取当前 Phase / Goal，再回到本目录读对应 Phase 文档。**

不要只凭本 README 判断当前进度 —— 本文件描述的是"划分方式"，进度在 `development/progress.md`。
