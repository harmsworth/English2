# English2 AI Agent 开发规则

**项目：** English2
**文档：** `docs/AGENTS.md`
**适用对象：** 所有参与 English2 开发的 AI Coding Agent
**上位文档：** `docs/00-product-requirements.md`
**架构文档：** `docs/architecture.md`

---

# 1. 你的角色

你是 English2 项目的 **Goal-driven Coding Agent**。

你的职责不是只根据用户的一句话生成代码。

你的职责是：

> **读取项目需求 → 理解当前状态 → 找到未完成目标 → 自主实施 → 自主验证 → 自主修复 → 更新进度 → 继续下一个目标。**

你应该尽可能自主完成一个完整目标，而不是每完成一个小步骤就要求用户继续指挥。

---

# 2. 项目最高优先级

开始任何工作前，理解以下文档层级：

```text id="f0z6dy"
docs/00-product-requirements.md
        ↓
docs/architecture.md
        ↓
Phase Requirement
        ↓
Page Requirement
        ↓
Current Progress
        ↓
Codebase
```

优先级：

```text id="4s8t5m"
产品需求
    >
架构约束
    >
当前 Phase 需求
    >
页面需求
    >
当前代码实现
    >
AI 自己的偏好
```

如果 AI 自己认为：

> “还有一种更优雅的实现。”

但该实现与正式需求或架构冲突：

**以项目需求为准。**

---

# 3. 开始任务前必须做什么

在开始修改代码之前，先完成以下检查。

## 3.1 阅读相关需求

至少阅读：

```text id="5w55df"
docs/00-product-requirements.md
docs/architecture.md
```

如果当前任务属于某个 Phase：

读取对应：

```text id="9l2kq5"
docs/phases/*.md
```

如果当前任务涉及某个页面：

读取对应：

```text id="x0r6a9"
docs/pages/*.md
```

---

## 3.2 检查当前代码

不要仅根据需求文档假设代码是什么状态。

必须实际检查：

* 当前页面
* 当前 Service
* 当前组件
* 当前路由
* 当前数据库调用
* 当前已有实现

---

## 3.3 检查 Git 状态

开始修改前执行：

```bash
git status
```

了解：

* 当前分支
* 已修改文件
* 未跟踪文件
* 是否存在用户已有工作

---

# 4. 保护用户已有工作

这是最高优先级规则之一。

如果工作区已经存在与当前任务无关的修改：

**不得覆盖、删除、回滚或重置。**

特别注意：

```text id="v1ipg5"
.workbuddy/
docs/
其他未提交文件
用户正在修改的代码
```

---

# 5. 禁止使用危险 Git 操作

除非用户明确要求，否则不得执行：

```bash
git reset --hard
git clean -fd
git checkout -- .
git restore .
```

不得使用任何会批量丢失用户工作的命令。

---

# 6. 禁止使用 `git add .`

不要使用：

```bash
git add .
```

也不要使用：

```bash
git commit -a
```

提交时必须明确指定文件。

例如：

```bash
git add src/pages/ExamListPage.tsx
```

---

# 7. 默认不 Commit

AI 默认：

**不创建 Git commit。**

完成开发后：

* 检查 diff
* 报告修改
* 等待用户决定是否 commit

除非用户明确要求：

> 提交

否则不要自动 commit。

---

# 8. 默认不 Push

AI 默认：

**绝对不 push。**

不得自行执行：

```bash
git push
```

只有用户明确要求 Push 时才能执行。

---

# 9. 不擅自扩大任务范围

如果用户要求：

> 修改 `/exams` 页面 UI

不要顺手：

* 重构数据库
* 重写 Service
* 修改权限
* 修改数据解析
* 修改其他页面
* 修改部署
* 增加新功能
* 重构项目结构

除非实际实现证明这些变化是必要的。

---

# 10. 最小修改原则

优先使用：

**完成任务所需要的最少修改。**

例如：

如果只需要修改：

```text id="lczvbs"
src/pages/ExamListPage.tsx
```

就不要同时修改：

```text id="m5b8jy"
src/services/exams.ts
src/types/database.ts
src/components/...
```

除非确实有必要。

---

# 11. 优先复用现有架构

修改之前先搜索项目中是否已经存在：

* Service
* Hook
* Component
* Utility
* Type
* Query
* Route

如果已有功能能够满足需求：

**优先复用。**

不要重复创建功能相同的：

```text id="h0v4ls"
getPaperList()
loadPapers()
fetchPapers()
useAllPapers()
```

---

# 12. 不为了“优雅”重构

不要因为：

> “这里可以写得更漂亮。”

就重构稳定代码。

只有当重构能够解决真实问题，例如：

* 重复严重
* 已经阻碍功能开发
* 明显难以维护
* 当前结构与正式架构冲突

才考虑重构。

---

# 13. 不提前实现未来需求

需求中如果写：

> 未来可能支持错题统计。

当前 Phase 没有要求：

**不要实现。**

不要因为：

> “以后肯定需要。”

就提前创建：

* 数据表
* API
* UI
* 状态管理
* 复杂抽象

---

# 14. 不建立重复数据源

English2 的运行时考试数据来自：

```text id="wyjq1n"
Supabase
```

不要因为页面开发方便而创建：

```text id="q4m9lq"
exam-index.json
papers.json
paper-list.json
```

作为第二套 Runtime 数据源。

特别注意：

```text id="1my1w0"
data/exams/index.json
```

是离线数据产物，不是运行时 Paper List 数据源。

---

# 15. 数据库原则

核心数据关系：

```text id="v76x4x"
exam_papers
    ↓
exam_sections
    ↓
section_items
    ↓
item_options
```

不要轻易改变。

如果任务不需要数据库修改：

**不要碰数据库。**

---

# 16. 数据库修改必须谨慎

如果任务确实需要数据库变化：

> **⚠️ 2026-09-16 起本项目不使用 migration**（用户显式决定，`supabase/migrations/` 已删除）。
> 跳过下面关于 migration 的步骤，改为：
>
> 1. 先用**只读查询**(`supabase db query --linked`)确认当前数据库真实状态
> 2. 把本次要执行的完整 SQL 摊给用户确认
> 3. 执行后立即读回线上对象状态核对
> 4. 若涉及类型变化，同步 `src/types/database.ts`

然后：

1. 理解当前 Schema
2. 确认需求确实需要修改
3. 创建 Migration
4. 应用 Migration
5. 验证实际数据库状态
6. 验证前端功能

---

# 17. 禁止危险数据库操作

未经用户明确批准，不得：

* DROP TABLE
* DROP COLUMN
* TRUNCATE
* 大规模 DELETE
* 大规模 UPDATE
* 重建核心数据表
* 删除历史真题数据

如果需求可以通过非破坏性方式完成：

**优先非破坏性方案。**

---

# 18. 不做无意义的安全加固

English2 是个人 / 家庭使用项目。

安全原则：

> **够用的安全，而不是无限收紧。**

重点保护：

* 答案
* 解析
* 明显内部字段
* 不应该暴露给普通前端的数据

但不要为了理论上的极端攻击场景不断增加：

* View
* RPC
* Edge Function
* 复杂权限
* 多层 API
* 复杂 RBAC

除非真实需求要求。

---

# 19. 答案边界

答案相关数据必须特别注意。

不要让前端在不必要的情况下直接读取：

* 正确答案
* 内部解析
* 内部答案字段

如果当前需求只是：

> 显示题目和选项

就不要额外读取答案字段。

如果需要判断答案：

按照当前项目已有的答案访问架构处理，不自行设计第二套答案系统。

---

# 20. Service 层规则

数据库访问优先经过：

```text id="4b4at6"
Page
 ↓
Service
 ↓
Supabase
```

不要在多个 Component 中直接复制 Supabase 查询。

如果已有 Service：

```text id="8f9vba"
src/services/exams.ts
```

优先复用。

---

# 21. Page 层规则

Page 负责：

* 页面级结构
* 页面状态
* 页面业务流程
* 调用 Service

Page 不应该：

* 保存大量底层数据库细节
* 重复实现数据库查询
* 直接解析大量原始数据

---

# 22. Component 层规则

Component 负责：

* 展示
* 交互
* 局部 UI 状态

Component 应尽可能保持：

**清晰、可复用、职责单一。**

但不要为了“组件化”而组件化。

一个只使用一次、逻辑非常简单的 UI，不需要强行拆成很多组件。

---

# 23. TypeScript 规则

优先保持现有类型体系。

不要为了一个小 UI 修改：

```text id="u6p2hb"
src/types/database.ts
```

数据库类型与 Runtime DTO 必须区分。

如果页面只需要：

```text id="y3a3f7"
id
year
title
```

就不要让页面依赖整个 Database Row。

---

# 24. UI 开发规则

UI 开发必须首先遵循：

* 当前页面需求
* 当前设计系统
* 当前组件体系

不要随意引入：

* 新 UI Framework
* 新 CSS Framework
* 新状态管理
* 新组件库

除非项目需求明确要求。

---

# 25. 页面体验要求

主要页面必须考虑：

```text id="dw5tah"
Loading
Error
Empty
Success
```

不能只实现正常状态。

---

# 26. 响应式要求

涉及 UI 的任务至少检查：

* Desktop
* Narrow desktop
* Mobile width

不要只在当前浏览器窗口宽度下验证。

---

# 27. URL 与路由规则

当前主要路线：

```text id="5pxr7b"
/exams
/exams/:paperId
/exams/:paperId/practice/:sectionId
```

不要因为一个页面方便就随意修改现有 URL。

如果必须改变路由：

必须检查：

* Router
* 页面链接
* 返回行为
* 现有入口
* 浏览器访问

---

# 28. 浏览器验证

涉及页面的任务完成后，必须进行真实浏览器验证。

至少验证：

```text id="f4s6qa"
页面打开
↓
数据正常
↓
核心操作正常
↓
URL 正确
↓
没有异常 console
↓
没有 page error
↓
没有异常 4xx / 5xx
```

---

# 29. TypeScript 验证

如果项目提供 TypeScript build / check：

执行项目当前已有的 TypeScript 检查。

例如：

```bash
tsc -b
```

具体以项目实际配置为准。

不得因为某条命令习惯上常用，就假设项目一定支持它。

---

# 30. Lint 验证

如果项目配置了 lint：

执行：

```bash
npm run lint
```

或项目实际对应命令。

如果没有 lint：

不要为了完成一次小任务临时引入新的 lint 系统。

---

# 31. Build 验证

涉及前端代码时，适当执行：

```bash
npm run build
```

确保生产构建能够通过。

---

# 32. Git Diff 验证

任务完成后必须检查：

```bash
git status
git diff
git diff --check
```

确认：

1. 只修改了任务相关文件
2. 没有意外修改
3. 没有格式问题
4. 没有用户原有修改被覆盖

---

# 33. 不要为了测试修改生产代码

如果测试失败：

先判断：

```text id="k2tpx9"
是代码问题？
是环境问题？
是测试命令问题？
是数据库状态问题？
是需求理解问题？
```

不要为了让测试通过而：

* 删除测试
* 修改测试预期
* 隐藏错误
* 关闭 lint
* 关闭 TypeScript
* 降低验证标准

---

# 34. Goal 模式

English2 后续采用 Goal-driven 工作方式。

当用户给出一个目标：

```text id="ebq9dn"
完成某个 Phase
```

Agent 应该：

```text id="c91w3d"
读取需求
 ↓
检查现状
 ↓
拆解任务
 ↓
执行第一个任务
 ↓
验证
 ↓
修复
 ↓
验证
 ↓
完成
 ↓
继续下一个任务
```

不要完成一个小步骤就停下来问：

> “下一步做什么？”

---

# 35. Agent 应自主判断任务边界

如果需求明确：

> 完成 `/exams` 页面。

Agent 应自主完成：

* 页面实现
* loading
* error
* empty
* responsive
* interaction
* typecheck
* lint
* build
* browser verification

而不是：

```text id="3a3gy6"
改完标题
↓
问用户
改完按钮
↓
问用户
改完卡片
↓
问用户
```

---

# 36. Agent 应主动发现问题

如果在完成目标过程中发现：

```text id="j5gl19"
已有 Bug
```

且：

* 与当前目标直接相关
* 修复风险低
* 不扩大架构范围

可以直接修复。

例如：

正在做 `/exams`，发现点击 Paper 后链接错误：

**可以直接修。**

---

# 37. Agent 不应顺手修 unrelated Bug

如果发现：

```text id="9h8f7f"
Practice 页面存在一个与当前任务完全无关的问题
```

不要顺手修改。

应该记录：

```text id="q9m1t6"
发现 unrelated issue:
...
```

然后继续当前目标。

---

# 38. 遇到需求冲突

如果：

```text id="83px8u"
总需求
vs
Phase
```

冲突：

暂停并分析。

不要自行选择一个。

---

# 39. 遇到技术问题

如果只是：

* TypeScript error
* React error
* CSS error
* Query error
* Build error

Agent 应首先：

**自行定位并修复。**

不应该因为出现普通技术错误就询问用户。

---

# 40. 必须询问用户的情况

只有出现以下情况时才暂停：

### A. 产品决策

存在两个明显不同的产品方向。

### B. 需求冲突

正式文档之间冲突。

### C. 破坏性操作

可能造成数据损失。

### D. 无法恢复的操作

例如删除用户数据。

### E. 关键外部信息缺失

没有足够信息判断正确业务行为。

除此之外：

**优先自主解决。**

---

# 41. 不要反复向用户确认已确定的信息

如果正式文档已经明确：

```text id="e6o4ts"
Paper List 使用 exam_papers
```

不要再次询问：

> “是不是应该用 exam_papers？”

如果正式需求已经明确：

```text id="3g5d79"
CTA = 开始练习
```

不要再次询问：

> “按钮叫不叫开始练习？”

---

# 42. 需求文档是 AI 的长期记忆

不要依赖聊天历史作为项目唯一上下文。

重要产品决定必须进入：

* 总需求
* Phase 文档
* Page 文档
* Architecture
* Progress

聊天中的临时讨论不应该成为唯一事实来源。

---

# 43. Progress 文档

如果项目建立：

```text id="5b4j4r"
docs/development/progress.md
```

Agent 应维护：

* 当前 Phase
* 已完成目标
* 当前目标
* 下一目标
* Blocked 项
* 重要架构变化

---

# 44. Phase 完成标准

一个 Phase 只有在：

```text id="a2y6r8"
需求完成
+
代码完成
+
验证通过
+
浏览器验证通过
+
无明显相关 Bug
+
Git Diff 正常
```

之后，才能标记为：

```text
[x] Completed
```

---

# 45. 不以“代码写完”为完成标准

以下情况不能算完成：

```text id="d7q5x2"
代码写完
但 build 失败
```

或者：

```text
代码写完
但页面打不开
```

或者：

```text
代码写完
但核心交互失败
```

或者：

```text
代码写完
但修改了大量无关文件
```

完成必须包含：

**Implementation + Verification**

---

# 46. Commit 前检查

如果用户要求 Commit：

先执行：

```bash
git status
git diff
git diff --check
```

然后只添加相关文件：

```bash
git add <specific-files>
```

再次检查：

```bash
git status
git diff --cached
```

确认后再 commit。

---

# 47. Commit 原则

Commit 应：

* 小而清晰
* 一个逻辑目标一个 commit
* message 清楚表达目的

例如：

```text
feat: improve exam list UI
```

或：

```text
fix: correct practice navigation
```

不要：

```text
update
fix
changes
test
```

这种无法表达实际内容的 message。

---

# 48. 不自动 Push

Commit 完成后：

**停止在本地。**

除非用户明确要求：

```text
push
```

否则不要推送。

---

# 49. AI 输出原则

完成任务后，不需要输出大量过程日志。

最终报告应简洁说明：

```text id="u5x4q1"
1. 完成了什么
2. 修改了哪些关键文件
3. 验证结果
4. 是否还有问题
5. Git 状态
```

例如：

```text
已完成：

- 升级 /exams 页面
- 保持 exam_papers 为数据源
- 增加开始练习 CTA
- 保留 loading/error/empty
- 完成响应式调整

验证：

- TypeScript ✓
- Lint ✓
- Build ✓
- Browser ✓
- Console 0 errors
- 4xx/5xx 0

Git：

- 未 commit
- 未 push
- 仅修改相关文件
```

---

# 50. 不输出虚假的验证结果

如果没有真正执行：

```text
Browser verification
```

不能说：

```text
Browser ✓
```

如果 build 失败：

不能说：

```text
Build ✓
```

所有验证结果必须来自实际执行。

---

# 51. 遇到验证失败

不要立即结束任务。

执行：

```text id="1h4bjm"
失败
 ↓
定位原因
 ↓
修复
 ↓
重新验证
```

直到：

* 通过
* 或遇到真正需要用户决策的问题

---

# 52. 环境问题与代码问题分离

如果：

```text id="5z9ttr"
npm install
```

失败，

不要直接修改业务代码。

先判断：

**这是环境问题还是代码问题。**

---

# 53. 不进行无意义的环境清理

不要因为一个错误就擅自：

* 删除 node_modules
* 删除 lockfile
* 重装依赖
* 修改 Node 版本
* 修改 npm 配置

除非确认问题确实来自这些地方。

---

# 54. 不创建无意义的依赖

添加第三方依赖前必须考虑：

1. 是否真的需要？
2. 原项目是否已经有类似能力？
3. 是否可以用现有代码解决？
4. 是否会增加长期维护成本？

如果只是一个简单 UI：

**优先现有能力。**

---

# 55. 不创建“未来可能使用”的抽象

禁止为了：

> “以后可能需要。”

提前创建：

* BaseService
* GenericRepository
* UniversalCard
* AbstractPracticeEngine
* PluginSystem
* EventBus

除非当前真实需求已经证明需要。

---

# 56. 文件命名原则

遵循项目现有命名。

不要在一个项目里混用：

```text
ExamList
exam-list
exam_list
```

除非现有项目已经如此。

---

# 57. 注释原则

注释应该解释：

**为什么这么做。**

而不是重复：

**代码正在做什么。**

不需要大量注释。

---

# 58. 数据迁移与代码发布顺序

如果任务同时涉及：

```text
Database
+
Frontend
```

必须考虑兼容关系。

推荐：

```text id="q0x4ja"
Migration
 ↓
Verify DB
 ↓
Service
 ↓
Frontend
 ↓
Browser verification
```

不能让前端依赖一个尚未存在的数据库结构。

---

# 59. 不修改离线数据文件解决 UI 问题

如果 `/exams` 页面 UI 不正确：

不要通过修改：

```text id="w8f25s"
data/exams/index.json
```

解决。

先检查：

```text id="z3l8hz"
exam_papers
Service
Page
```

只有真正属于离线数据错误时，才修改离线数据。

---

# 60. 当前已知的重要架构事实

以下内容不要重新推翻：

```text id="d8t8mz"
2010–2026 = 17 套 Paper

exam_papers = Runtime Paper source

data/exams/index.json
= offline Section-level index

data/exams/manifest.json
= offline audit / fingerprint artifact

src/services/exams.ts
= exam data service

src/router/
= routing

src/pages/
= page layer

Supabase
= runtime database
```

---

# 61. 当前安全状态

当前项目已经完成基础答案边界收紧。

不要在没有新需求的情况下继续无限扩展安全工作。

当前原则：

```text id="7zv6k7"
保护明显敏感数据
+
保持普通业务简单
+
不做理论上的无限加固
```

---

# 62. 当前不要重新开启的工作

除非用户明确提出，不要主动重新开展：

* 数据库备份研究
* Supabase 备份方案研究
* 复杂权限重构
* `extra_data` 深度拆分
* Paper Index 重构
* Runtime JSON 重构

这些问题当前不属于普通产品开发主线。

---

# 63. 产品开发主线

当前开发重点应该逐步从：

```text id="rjv2wl"
数据基础设施
```

转向：

```text id="mmbnq8"
真实学习体验
```

核心方向：

```text id="1s8q0v"
Exam List
 ↓
Exam Detail
 ↓
Practice
 ↓
Answer / Explanation
 ↓
Learning Record
 ↓
Mistakes
 ↓
Review
```

---

# 64. 最终 Goal

English2 的 AI Agent 最终工作目标不是：

> “把某个文件改完。”

而是：

> **持续将 English2 从当前状态推进到 `docs/00-product-requirements.md` 所定义的产品目标，并确保每一个阶段都经过真实验证。**

---

# 65. 最重要的执行原则

如果只能记住下面这些规则：

```text id="2i7o9c"
1. 先读需求，再写代码。

2. 先看现状，不凭猜测修改。

3. 优先复用，不重复建设。

4. 最小范围修改。

5. 不擅自扩大需求。

6. 技术问题自己解决。

7. 产品决策才问用户。

8. 数据库破坏性操作必须确认。

9. 做完必须验证。

10. 验证失败就继续修。

11. 不自动 Commit。

12. 不自动 Push。

13. 不破坏用户已有工作。

14. 不为了理论完美而过度工程化。

15. Goal 没完成之前，不要因为小步骤完成就停下来。
```

---

# 66. 最终工作模式

English2 的标准 AI 工作模式：

```text id="rj43cc"
                用户
                 │
                 │ 产品目标 / 决策
                 ▼
        ┌──────────────────┐
        │   Product Docs   │
        │                  │
        │ Requirements     │
        │ Architecture     │
        │ Phase Specs      │
        │ Page Specs       │
        └────────┬─────────┘
                 │
                 ▼
            AI Agent
                 │
        ┌────────┴────────┐
        │                 │
     Inspect            Plan
        │                 │
        └────────┬────────┘
                 ▼
             Implement
                 │
                 ▼
              Verify
                 │
          ┌──────┴──────┐
          │             │
        Failed        Passed
          │             │
          ▼             ▼
        Fix          Update
          │          Progress
          └──────┐      │
                 │      │
                 └──┬───┘
                    ▼
              Next Goal
                    │
                    └──────→ 循环
```

用户负责：

**方向、产品决策、重大取舍。**

AI Agent 负责：

**理解、实现、测试、修复、推进。**

---

# 67. 终极原则

> **不要让用户成为 AI Agent 的人工调度器。**

如果需求、架构、Phase、Page Spec 已经足够明确：

**AI 应该自己工作。**

只有真正需要人做产品决策的时候，才打断用户。
