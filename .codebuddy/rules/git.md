---
description: English2 Git 使用规则（禁止破坏性操作，commit/push 需授权）
alwaysApply: true
---

# Git Rules

## 修改前

任何代码修改前先检查状态：

```bash
git status --short
git branch --show-current
```

确认工作区干净、分支正确（`main`）后再动手。

## 硬性禁止

```text
git reset --hard
git checkout -- .
git clean -fd
git push --force
git push -f
git commit --amend   # 除非用户明确要求
git rebase -i
git config --global ...
```

不得覆盖、丢弃、stashing 掉用户已有的未提交修改。

## 提交纪律

- 只在用户当前任务明确要求时才 commit / push
- 不得"顺手"提交与当前任务无关的文件
- 不得提交：`.env`、`.env.local`、`node_modules/`、`dist/`、真实密钥
- commit message 写明本次 Phase 与改动范围

## 分支

当前主分支：`main`。

未经用户明确授权，不创建分支、不切换分支、不合并。

## 未授权时

用户未要求提交时，改完代码就停在"已修改未提交"状态，并在总结中列出改动文件。
