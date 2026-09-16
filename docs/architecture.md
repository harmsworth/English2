# English2 系统架构文档

**项目名称：** English2
**文档路径：** `docs/architecture.md`
**文档性质：** 系统架构基准文档
**适用对象：** 开发者、AI Coding Agent、后续维护者
**上位文档：** `docs/00-product-requirements.md`

---

# 1. 文档目的

本文档定义 English2 当前及后续开发所遵循的系统架构。

它主要回答以下问题：

1. English2 由哪些部分组成？
2. 数据从哪里来？
3. 数据如何进入数据库？
4. 前端如何读取数据？
5. 页面之间如何组织？
6. 各层分别负责什么？
7. 哪些数据可以进入前端？
8. 哪些架构原则不能被随意破坏？
9. AI Agent 修改代码时应该遵循什么边界？

本文档不是具体页面需求文档。

页面的视觉和交互要求，应由：

`docs/pages/*.md`

定义。

---

# 2. 总体架构

English2 当前采用：

**React + TypeScript + Supabase + PostgreSQL**

整体结构：

```text
                    English2
                       │
        ┌──────────────┴──────────────┐
        │                             │
   Offline Data                  Web Application
        │                             │
        │                        React + TypeScript
        │                             │
        │                        Service Layer
        │                             │
        │                         Supabase
        │                             │
        │                        PostgreSQL
        │                             │
        └──────────────┬──────────────┘
                       │
                Structured Exam Data
```

---

# 3. 核心数据架构

English2 最核心的数据关系：

```text
exam_papers
      │
      │ 1:N
      ▼
exam_sections
      │
      │ 1:N
      ▼
section_items
      │
      │ 1:N
      ▼
item_options
```

对应业务概念：

```text
Paper
  └── Section
        └── Item
              └── Option
```

---

# 4. Paper 层

数据库表：

```text
public.exam_papers
```

业务含义：

**一套完整的英语（二）历年真题。**

例如：

```text
英语（二）2026 年真题
英语（二）2025 年真题
...
英语（二）2010 年真题
```

当前：

* 2010–2026
* 共 17 套
* 每一年对应一套当前 Paper

---

## 4.1 Paper 层职责

Paper 层负责：

* 标识哪一年
* 标识哪一套试卷
* 控制 Paper 是否为当前版本
* 作为 Section 的顶层父级

---

## 4.2 当前运行时主要字段

前端 Paper List / Detail 的公开 DTO 只包含：

```text
id
year
title
```

`is_current` 不进入 DTO，仅在 `getCurrentExamPapers()` 中作为**过滤条件**
（`is_current = true`）；`source_id` / `version` / `content_hash` / `source_file` /
`metadata` 属于同步与审计字段，不下发。

其他内部字段不应成为普通 Paper List 的运行时依赖。

---

# 5. Section 层

数据库表：

```text
public.exam_sections
```

业务含义：

**一套试卷中的一个考试部分。**

Section 通过：

```text
paper_id
```

关联到：

```text
exam_papers.id
```

---

## 5.1 Section 层职责

Section 负责描述：

* Section 类型
* Section 标题
* 顺序
* 时间
* 分值
* passage
* prompt
* tips
* 其他 Section 级学习信息

---

# 6. Item 层

数据库表：

```text
public.section_items
```

业务含义：

**Section 中的一道具体题目。**

通过：

```text
section_id
```

关联：

```text
exam_sections.id
```

---

## 6.1 Item 层职责

Item 主要负责：

* 题号
* 题目内容
* 题目类型
* 顺序
* 所属 Section

---

# 7. Option 层

数据库表：

```text
public.item_options
```

业务含义：

**一道题的选项。**

通过 Item 关联。

典型结构：

```text
Item
 ├── A
 ├── B
 ├── C
 └── D
```

---

# 8. 数据层级不可随意改变

核心关系：

```text
Paper
 ↓
Section
 ↓
Item
 ↓
Option
```

是 English2 当前最重要的业务数据模型。

后续新增功能时，应优先基于该模型扩展。

除非有明确产品需求和架构理由，不应：

* 创建第二套 Paper 模型
* 创建第二套 Item 模型
* 创建重复题库
* 使用页面专用 JSON 代替数据库
* 将不同层级的数据混合到一个新的巨大对象中

---

# 9. 数据来源架构

English2 的数据来源分为两类：

```text
                    数据
                     │
           ┌─────────┴─────────┐
           │                   │
      Offline Data        Runtime Data
           │                   │
     data/exams/           Supabase
           │                   │
      数据处理/审计          Web App
```

---

# 10. Offline Data

目录：

```text
data/exams/
```

主要负责：

* 原始考试数据
* 数据解析
* 数据转换
* 数据校验
* 数据同步
* 数据审计
* 数据指纹

它不是前端运行时 API。

---

# 11. `index.json`

文件：

```text
data/exams/index.json
```

当前属于：

**离线 Section-level 索引。**

它目前不是完整的 Paper-level 索引。

当前约有：

**153 个 Section-level 条目。**

因此：

```text
data/exams/index.json
```

不得被误认为：

```text
17 套历年真题的运行时 Paper Index
```

---

## 11.1 Runtime 原则

`/exams` 页面应该从：

```text
exam_papers
```

获取 Paper 列表。

不得为了 `/exams` 页面重新建立一个：

```text
data/exams/papers.json
```

之类的运行时重复数据源。

---

# 12. `manifest.json`

文件：

```text
data/exams/manifest.json
```

主要用于：

* 源文件信息
* 文件指纹
* SHA256
* 数据统计
* 数据同步
* 数据审计

它不是正常用户页面的数据源。

---

# 13. Runtime Data Source

运行时的核心事实来源：

```text
Supabase PostgreSQL
```

前端通过：

```text
Supabase Client
```

访问数据库。

---

# 14. 前端架构

当前前端采用：

**React + TypeScript**

核心职责划分：

```text
Pages
  ↓
Components
  ↓
Services
  ↓
Supabase
  ↓
PostgreSQL
```

---

# 15. Pages 层

目录：

```text
src/pages/
```

当前全部页面：

```text
src/pages/LoginPage.tsx        /login    公开路由，未登录落点
src/pages/HomePage.tsx         /         登录后落地页
src/pages/ExamListPage.tsx     /exams    历年真题列表
src/pages/ExamDetailPage.tsx   /exams/:paperId
src/pages/PracticePage.tsx     /exams/:paperId/practice/:sectionId
src/pages/NotFoundPage.tsx     *         兜底 404
```

页面行为定义在 `docs/pages/*.md`。

Page 层负责：

* 页面级布局
* 页面状态组织
* 页面级数据调用
* 页面之间的业务流程

Page 不应该承担大量底层数据库细节。

---

# 16. Components 层

目录：

```text
src/components/
```

例如：

```text
src/components/exams/
```

Component 层负责：

* UI 展示
* 用户交互
* 可复用视觉组件
* 局部状态

Component 不应该直接绕过 Service 层建立大量数据库查询。

---

# 17. Service 层

主要目录：

```text
src/services/
```

例如：

```text
src/services/exams.ts
src/services/practice.ts
```

Service 层负责：

* Supabase 查询
* 数据获取
* 数据映射
* 数据访问逻辑
* 对 Page 提供稳定的数据接口

---

# 18. 为什么需要 Service 层

推荐的数据流：

```text
Page
 ↓
Service
 ↓
Supabase
 ↓
Database
```

而不是：

```text
Page
 ↓
Supabase
 ↓
Database

Component
 ↓
Supabase
 ↓
Database

Another Component
 ↓
Supabase
 ↓
Database
```

这样可以避免数据库访问逻辑散落在整个前端。

---

# 19. 当前 Exam Service

核心文件：

```text
src/services/exams.ts
```

负责考试相关数据访问。

主要能力包括：

```text
getCurrentExamPapers()
getExamPaperById()
```

其中：

`getCurrentExamPapers()`

负责获取当前 Paper 列表。

当前逻辑：

```text
exam_papers
 ↓
is_current = true
 ↓
year DESC
 ↓
Paper List
```

---

# 20. Paper List 数据流

当前 `/exams`：

```text
/exams
   ↓
ExamListPage
   ↓
useExamPapers
   ↓
getCurrentExamPapers()
   ↓
exam_papers
   ↓
17 Papers
```

因此：

**Paper List 已经拥有正确的数据架构。**

如果未来需要优化 `/exams` UI，应优先修改：

```text
src/pages/ExamListPage.tsx
```

而不是重新设计数据源。

---

# 21. Paper Detail 数据流

当前：

```text
/exams/:paperId
   ↓
ExamDetailPage
   ↓
getExamPaperById()
   ↓
exam_papers
   ↓
exam_sections
   ↓
section_items
   ↓
item_options
```

---

# 22. Practice 数据流

当前：

```text
/exams/:paperId/practice/:sectionId
                ↓
          PracticePage
                ↓
        Practice Service
                ↓
        Section / Items
                ↓
             Options
```

Practice 页面只处理当前 Section 的练习流程。

---

# 23. 路由架构

路由实际位于：

```text
src/router/
```

而不是：

```text
src/routes/
```

当前全部路线：

```text
/login                                  公开，未登录访问其他路由时重定向到此
/
│
└── /exams
      │
      ├── /exams/:paperId
      │
      └── /exams/:paperId/practice/:sectionId
*                                       兜底 404（NotFoundPage）
```

`/` 与 `/exams*` 均在 `ProtectedRoute` 之下，未登录会被挡到 `/login`。
路由参数用 `paperId`（试卷 id，不是年份），这样将来同一年多版本共存也不必改路由。

---

# 24. 页面之间的业务关系

```text
Home
 │
 │ 点击历年真题
 ▼
Exam List
 │
 │ 选择 Paper
 ▼
Exam Detail
 │
 │ 选择 Section
 ▼
Practice
 │
 │ 完成练习
 ▼
Result / Answer
 │
 ├── Explanation
 ├── Mistake
 └── History
```

后面的节点属于逐步建设的产品能力。

---

# 25. 页面与数据层的边界

页面不应该自己决定数据结构。

例如：

不推荐：

```text
ExamListPage
 ↓
自己读取多个 JSON
 ↓
自己拼 Paper
 ↓
自己判断当前版本
```

推荐：

```text
ExamListPage
 ↓
getCurrentExamPapers()
 ↓
Paper DTO
```

---

# 26. DTO / 数据映射原则

前端 Service 可以使用 DTO 对数据库结构进行适当裁剪。

原则：

**页面需要什么，Service 就提供什么。**

不要让页面依赖整个数据库 Row。

例如 Paper List 只需要：

```text
id
year
title
```

则不需要把所有数据库字段传到 UI。

---

# 27. 数据库字段与 TypeScript 类型

数据库类型定义可以包含完整数据库结构。

例如：

```text
src/types/database.ts
```

包含数据库完整字段并不意味着：

**这些字段都必须暴露给前端运行时。**

必须区分：

```text
Database Type
```

和：

```text
Runtime Select
```

---

# 28. 数据权限架构

English2 当前采用：

**够用的安全边界。**

核心原则：

```text
用户需要的业务数据
        ↓
正常读取

内部 / 答案相关数据
        ↓
只在真正需要的位置提供
```

---

# 29. 当前已经关闭的明显内部数据边界

以下字段不属于普通前端用户读取范围：

```text
exam_sections.passage_zh
exam_sections.source_data

section_items.correct_option
section_items.explanation
section_items.extra_data
```

这些字段的具体访问策略以实际数据库权限和 Migration 为准。

---

# 30. `exam_sections.extra_data`

该字段目前属于：

**混合用途 JSON 数据。**

其中存在前端实际使用的信息。

因此目前不为了理论上的字段级完美隔离而：

* 创建复杂 View
* 创建 RPC
* 拆成大量新表
* 重构现有数据

原则：

**保持简单，只有真实需求出现时再处理。**

---

# 31. Answer Boundary

答案系统必须特别注意：

```text
用户作答
        ↓
答案判断
        ↓
结果
        ↓
解析
```

不能因为前端方便而把：

```text
正确答案
解析
内部答案字段
```

无条件作为普通公开数据读取。

**已落地（2026-09-16，Phase 6）：**

受控出口是 RPC `public.grade_practice_section(p_session_id uuid)`
（SECURITY DEFINER、`set search_path = public, pg_temp`、先校验 `user_id = auth.uid()`、
只返回**本次实际作答过**的题）。

这**没有**放宽上面的边界：

- 答案列（`correct_option` / `explanation` / `section_items.extra_data`）仍未回到
  `src/services/exams.ts` 的查询白名单；
- 判分通路与题库浏览通路分离 —— 前者只能由"提交自己的会话"触发，无法用来批量拉全库答案；
- 前端唯一渲染答案的地方是 `src/components/practice/PracticeResult.tsx`，且只在提交之后。

若真要做防作弊的在线考试模式，仍需重新评估（当前 RPC 只解决"提交后判分"，不解决"作答期间不可拿答案"之外的问题）。

当前不提前过度设计。

---

# 32. 不使用 View / RPC 的原则

当前不为了每一个潜在字段创建：

* View
* RPC
* Server Function
* Edge Function

只有在以下情况才考虑：

1. 真实业务需要
2. 前端权限无法通过普通数据库权限合理实现
3. 数据计算明显应该在服务端完成
4. 查询逻辑已经复杂到需要数据库封装

---

# 33. 用户学习数据架构

未来学习数据可以逐步建立在核心题库模型之外。

逻辑上：

```text
Core Exam Data
       │
       ├── exam_papers
       ├── exam_sections
       ├── section_items
       └── item_options

User Learning Data
       │
       ├── practice_sessions   练习 / 考试 / 错题会话
       ├── practice_answers    每次作答
       ├── mistakes            错题
       └── mistake_reviews     错题复习记录
```

以上四表**已存在于数据库**，其中 `practice_sessions` / `practice_answers`
已被 Phase 5 使用；`mistakes` / `mistake_reviews` 已建表并完成授权，
但尚无前端代码使用（属 [Phase 7](./phases/phase-07-learning-loop.md) 范围）。

`favorites`（收藏）等能力当前**不存在、也没有已授权的计划**，不要凭本图臆造。

二者关系：

```text
Core Content
      ↓
Learning Behavior
```

不要把用户学习行为直接塞入核心题库表中。

---

# 34. 学习数据的基本原则

未来用户学习数据应该能够回答：

```text
谁
做了
哪一套 Paper
哪个 Section
哪一道题
什么时候
选择了什么
结果如何
```

`practice_sessions` / `practice_answers` / `mistakes` / `mistake_reviews`
四表结构已确定并已建表（见 `src/types/database.ts`），
因此「谁做了哪套哪题、什么时候、选了什么、结果如何」在**数据模型层面已有答案**。

尚未确定的是这些数据的**产品用法**（历史页长什么样、错题如何收纳与复习），
那属于 [Phase 7](./phases/phase-07-learning-loop.md)，开始设计时再定义页面与交互。
本架构文档不提前锁死未授权阶段的产品细节。

---

# 35. 数据库变更

> **⚠️ 现行方式（用户显式决定，2026-09-16，已生效）：**
>
> **不使用 migration。** `supabase/migrations/` 目录已从仓库移除。
> 数据库变更直接用 `npx supabase db query --linked --project-ref <ref> -f <sql>` 作用于线上库。
> **不要求也不生成 SQL 备份。**
>
> 因此下列检查改为「执行前确认」而非「写文件」：

1. 有明确需求
2. **执行前**用只读查询确认当前数据库真实状态
3. 用 `supabase db query --linked` 应用到线上库
4. 立即读取并验证实际数据库状态（`information_schema` / `pg_get_functiondef` / `pg_policies`）
5. 验证前端功能

不要只修改本地 TypeScript 类型。

**代价与应对：**

```text
代价：变更不在仓库留痕 → 不可追溯、不可回滚、换环境需手工重建。
应对：
  1. 每次执行前先把本次要跑的完整 SQL 写进 docs/development/decisions.md 或临时文件，
     由用户在聊天里确认后再跑；
  2. 跑完立刻读取线上对象状态确认；
  3. src/types/database.ts 若有变化，必须在同一轮同步更新。
```

> 历史说明：仓库曾有一组基线 migration（`9383666`，6 个文件），
> 已于 2026-09-16 由用户删除。不要再据此假设存在 migration 工作流。

---

# 36. 数据库与前端的事实优先级

当出现不同来源的信息冲突时，默认优先级：

```text
实际数据库
    >
Service 实际查询
    >
前端类型
    >
离线 JSON
    >
旧文档 / 旧假设
```

但是：

**产品需求文档优先决定“应该是什么”。**

也就是说：

```text
产品需求
    ↓
决定目标状态

实际数据库
    ↓
决定当前事实
```

两者不一致时，应识别为：

**需要解决的差异**

而不是擅自假设二者相同。

---

# 37. 文档架构

项目文档建议：

```text
docs/
│
├── 00-product-requirements.md     最终做什么
├── architecture.md                系统怎么组织
├── AGENTS.md                      AI 行为规则
│
├── phases/                        这一阶段完成什么
│   ├── README.md                  划分方式与路线图总表
│   ├── phase-01-foundation.md
│   ├── phase-02-content-pipeline.md
│   ├── phase-03-auth.md
│   ├── phase-04-exam-browse.md
│   ├── phase-05-practice.md
│   ├── phase-06-answer-review.md
│   └── phase-07-learning-loop.md
│
├── pages/                         这个页面怎么工作
│   ├── README.md
│   ├── home.md
│   ├── login.md
│   ├── exams.md
│   ├── exam-detail.md
│   ├── practice.md
│   └── not-found.md
│
├── development/                   AI 如何推进
│   ├── README.md
│   ├── workflow.md                标准开发循环
│   ├── progress.md                当前状态入口
│   ├── acceptance.md              通用验收标准
│   └── decisions.md               重要决策记录
│
└── data/                          数据从哪来、怎么流动
    └── README.md
```

关系：

```text
00-product-requirements.md
            │
            ▼
      architecture.md ──── data/
            │
      ┌─────┴─────┐
      ▼           ▼
   Phase 文档   Page 文档
      │           │
      └─────┬─────┘
            ▼
        AI Agent
            │            ← development/（workflow / progress / acceptance / decisions）
            ▼
         Codebase
```

---

# 38. 代码目录原则

当前重要目录：

```text
src/
├── pages/
├── components/
├── services/
├── types/
└── router/
```

数据库：

```text
supabase/          （migrations/ 已删除，不使用 migration 工作流）
```

离线数据：

```text
data/
└── exams/
```

文档：

```text
docs/
```

---

# 39. 修改代码的最小范围原则

AI Agent 接到任务后：

**优先修改完成任务所必需的最少文件。**

例如：

“优化 `/exams` 页面”

优先：

```text
src/pages/ExamListPage.tsx
```

必要时：

```text
src/components/exams/*
```

不应因为任务涉及 `/exams` 就顺手修改：

```text
src/services/exams.ts
数据库
数据解析脚本
其他页面
```

除非实际需求证明这些修改是必要的。

---

# 40. 不重复建设原则

如果系统已经存在：

```text
getCurrentExamPapers()
```

就不要再创建：

```text
getPaperList()
getAllPapers()
loadExamIndex()
readPaperIndex()
```

等功能相同但职责重复的方法。

先复用现有架构。

---

# 41. 重构原则

重构必须有明确理由。

可以重构：

* 已经明显阻碍功能开发的结构
* 重复严重的代码
* 已经产生真实维护成本的设计

不应该仅仅因为：

> “这种写法不够优雅。”

就大范围重构稳定代码。

---

# 42. 性能架构原则

当前数据规模：

```text
17 Papers
```

属于非常小的数据规模。

因此当前不需要：

* Redis
* Elasticsearch
* CDN 数据层
* 微服务
* 消息队列
* 大规模缓存体系

优先：

**简单、正确、可维护。**

只有真实性能问题出现后再优化。

---

# 43. 错误处理架构

数据访问失败应该经过：

```text
Database
 ↓
Service
 ↓
Page
 ↓
User-friendly Error UI
```

不要让底层数据库错误直接成为用户看到的页面内容。

---

# 44. Loading 状态

主要异步页面必须能够表达：

```text
Loading
Loaded
Error
Empty
```

不要只实现：

```text
Loading
Loaded
```

然后让异常请求产生空白页面。

---

# 45. 浏览器验证架构

每一个核心用户流程完成后，应进行真实浏览器验证。

核心链路：

```text
Home
 ↓
Exam List
 ↓
Exam Detail
 ↓
Practice
 ↓
Answer / Result
```

验证重点：

* 页面是否正常
* URL 是否正确
* 数据是否正确
* 交互是否正常
* Console 是否有错误
* Page Error 是否存在
* HTTP 是否有异常

---

# 46. 架构变更原则

以下变化属于重要架构变化：

* 修改核心数据库关系
* 新增核心数据层
* 改变 Runtime 数据源
* 改变路由体系
* 引入新的后端服务
* 引入新的状态管理体系
* 改变认证体系
* 大规模重构前端结构

发生这类变化时：

**必须先更新架构文档或相关 Phase 需求，再实施。**

---

# 47. 不属于架构变化的普通修改

以下通常不需要修改本文件：

* 调整按钮样式
* 调整页面布局
* 修改文字
* 增加一个局部组件
* 修复普通 Bug
* 优化一个已有查询
* 调整 Loading UI
* 调整移动端布局

---

# 48. AI Agent 架构检查规则

AI Agent 在开始任务前，应先判断：

```text
这个任务属于：

A. 页面 UI
B. 页面交互
C. Service
D. 数据库
E. 数据处理
F. 架构变化
```

如果属于 A/B/C：

优先在现有架构内解决。

如果属于 D/E：

检查相关 Phase 和数据文档。

如果属于 F：

必须检查：

```text
00-product-requirements.md
architecture.md
相关 Phase
相关 Page
```

必要时暂停等待产品决策。

---

# 49. 当前架构基准

截至当前版本，以下内容视为稳定基准：

```text
Frontend
React + TypeScript

Database
Supabase PostgreSQL

Exam hierarchy
Paper → Section → Item → Option

Runtime source
Supabase

Offline source
data/exams/

Paper List
exam_papers

Paper Detail
exam_papers + exam_sections + section_items + item_options

Routing
src/router/

Pages
src/pages/

Services
src/services/

Database changes
直接线上执行（不使用 migration）
```

---

# 50. 架构最终目标

English2 不追求复杂架构。

最终希望形成：

```text
                    English2
                       │
          ┌────────────┴────────────┐
          │                         │
      Content                    Learning
          │                         │
          ▼                         ▼
       Papers                    Attempts
          │                         │
       Sections                   Answers
          │                         │
        Items                   Mistakes
          │                         │
       Options                   History
          │                         │
          └──────────┬──────────────┘
                     │
                     ▼
              Long-term Learning
```

其中：

**Content 是基础，Learning 是目的。**

架构设计应该服务于这一目标，而不是让架构本身成为产品。

---

# 51. 核心架构原则总结

English2 的架构遵循以下原则：

1. **数据库是运行时事实来源。**
2. **Paper → Section → Item → Option 是核心数据关系。**
3. **离线 JSON 不作为运行时重复数据源。**
4. **Page 不直接承担复杂数据库访问逻辑。**
5. **Service 负责数据访问和映射。**
6. **Component 负责展示和交互。**
7. **核心题库数据与用户学习数据分离。**
8. **答案边界需要保护，但不过度工程化。**
9. **简单方案优先。**
10. **真实问题出现后再进行复杂化。**
11. **尽量复用已有架构。**
12. **避免重复建设。**
13. **避免无意义的大规模重构。**
14. **重大架构变化必须有明确理由。**
15. **AI Agent 必须遵循需求文档和架构边界。**
16. **最终架构服务于学习体验，而不是技术本身。**
