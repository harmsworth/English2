---
description: English2 Phase 渐进式开发纪律（禁止跨阶段实现）
alwaysApply: true
---

# Phase Discipline

## Phase 列表

> ⚠️ **Phase 的唯一定义源是 `docs/phases/`（`README.md` + `phase-*.md`）。**
> 本文件**不再**维护 Phase 清单，只维护跨阶段的开发纪律。
> 需要知道"现在在哪个 Phase / 这一阶段做什么"时，读 `docs/phases/README.md` 与
> `docs/development/progress.md`，**不要**凭本文件推断。

历史上本文件曾列过一份按代码模块划分的 10 阶段清单（Project initialization /
Database types / Authentication / Question-bank synchronization / …），
**该清单已废弃** —— 它与 `docs/phases/` 的编号相同但含义不同，容易取错文档。

## 规则

1. 只实现用户**当前明确授权**的 Phase。
2. 不得主动跨 Phase。
3. 不得"顺手"实现未来功能。
4. 发现未来需求，只记录，不实现。
5. 当前 Phase 完成后立即停止。
6. 必须等待用户明确说"继续"或明确授权下一 Phase。

## Build Gate

每个 Phase 结束前必须通过：

```bash
pnpm lint
pnpm build
```

（以及 Phase 要求的类型生成检查）

未通过不得宣称该 Phase 完成，也不得进入下一 Phase。

## 范围外的常见诱惑

以下都不属于当前未授权 Phase，禁止顺手做：

- 未授权 Phase 就加 Auth
- 未授权 Phase 就写同步逻辑
- 未授权 Phase 就改 RLS
- 未授权 Phase 就造 mock 数据
- 未授权 Phase 就加 PWA / service worker

## 阻塞处理

如果当前 Phase 因环境问题无法完成：

- 必须明确报告 `BLOCKED`
- 说明阻塞层（环境 / 权限 / 信息缺失）
- 不得伪造成功结果
- 不得跳过该 Phase 去做后面的 Phase
