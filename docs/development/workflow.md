# AI Agent 开发工作流

**适用对象：** 所有参与 English2 的 AI Coding Agent
**上位文档：** `docs/AGENTS.md`

---

## 1. 标准循环

```text
Read     读 progress → Phase → Page → 相关约束
   ↓
Inspect  检查真实代码，确认文档与代码是否一致
   ↓
Plan     拆出本轮要完成的 Goal（一个 Goal 一轮，不混着做）
   ↓
Implement 按最小修改原则改代码
   ↓
Verify   TypeScript → Lint → Build → 浏览器
   ↓
Fix      失败就定位、修复
   ↓
Re-verify 重新验证，直到通过
   ↓
Update   更新 progress.md
   ↓
Next     直接进入下一个 Goal
```

---

## 2. 核心纪律

> **不要完成一个小步骤就停下来问"下一步做什么？"**

只要目标明确，就继续执行到 Goal 完成。
只有 `docs/AGENTS.md` §40 列出的五种情况才暂停询问用户：

1. 需要产品决策（两个方向都会明显影响产品体验，需求没规定）
2. 正式文档之间冲突
3. 可能造成数据损失的破坏性操作
4. 不可逆操作
5. 缺少判断正确业务行为所必需的关键信息

**以下情况不询问，自己解决：**

- TypeScript / React / CSS / Query / Build 错误
- 页面布局、文案、样式细节
- 命令失败但属于环境可恢复范围
- 文档交叉引用、目录组织
- 需要读哪个文件、跑哪条命令

---

## 3. 每步具体要求

### Read

必读（按顺序）：

```text
docs/development/progress.md
docs/phases/phase-XX-*.md
docs/pages/*.md（仅本 Goal 涉及的页面）
```

涉及数据库 / 安全边界时另读：

```text
docs/architecture.md（§28–§35）
docs/data/README.md
```

### Inspect

- 不要假设代码状态，实际打开看
- 文档与代码冲突时：**先确认哪个是新的**，再决定跟谁；无法判断就按 `docs/architecture.md` §36 的优先级（实际数据库 > Service 实际查询 > 前端类型 > 离线 JSON > 旧文档）

### Plan

- 一次一个 Goal
- 写出「改哪些文件」的预期清单，收尾时对着 diff 检查
- 如果实现过程中发现必须多改文件，先判断是不是真的必要（最小修改原则）

### Implement

- 优先复用已有 Service / Hook / Component / Query / Route
- 不新增依赖，除非现有能力确实解决不了
- 不提前实现未来需求
- 不为了"更优雅"重构稳定代码

### Verify

见 [acceptance.md](./acceptance.md)。按任务性质裁剪，但**不能裁剪掉浏览器验证**（涉及页面时）。

### Fix / Re-verify

- 失败后定位原因，修复，重跑
- 不通过删除测试、关闭 lint、降低标准的方式"让验证通过"
- 环境问题与代码问题分开判断（`docs/AGENTS.md` §52）

### Update

更新 `docs/development/progress.md`：

```text
Current Goal → Completed Goals
新增 Known Issues（若有）
Last Verification（实际执行了什么、结果如何）
Last Updated
```

### Next

直接进入下一个 Goal，不等用户。

---

## 4. Git 纪律

- **默认不 commit，绝对不 push**（`docs/AGENTS.md` §7–§8）
- 禁止：`git reset --hard` / `git clean -fd` / `git checkout -- .` / `git add .` / `git commit -a`
- 收尾必查：`git status` / `git diff` / `git diff --check`
- 工作区存在用户未提交修改时，**不覆盖、不回滚、不清理**

---

## 5. 完成一个 Goal 的标志

```text
代码完成
+ 验证通过（含浏览器）
+ 已知问题要么修好、要么记进 progress
+ git diff 只含本 Goal 相关文件
+ progress.md 已更新
```

五条缺一不可。
