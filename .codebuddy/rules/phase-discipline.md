---
description: English2 Phase 渐进式开发纪律（禁止跨阶段实现）
alwaysApply: true
---

# Phase Discipline

## Phase 列表

```text
Phase 1  — Project initialization               ✅ 已完成
Phase 2  — Database types and data access foundation
Phase 3  — Authentication
Phase 4  — Question-bank synchronization
Phase 5  — Historical exam practice
Phase 6  — Normal practice
Phase 7  — Mistakes
Phase 8  — Full exam mode
Phase 9  — Statistics
Phase 10 — PWA / mobile / offline
```

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
