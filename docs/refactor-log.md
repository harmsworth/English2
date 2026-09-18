# 设计重构落地记录

**日期：** 2026-09-17 · **依据：** [`design-direction.md`](./design-direction.md) · [`design-system.md`](./design-system.md) · [`refactor-audit.md`](./refactor-audit.md)
**范围：** 表现层重做（`src/index.css` + `ui/*` + `layout/*` + 5 个页面 + 路由外壳），**未触碰 `src/services/`、`src/hooks/`、`src/lib/`**

---

## 1. 决策记录（审计 §7 的 6 个未决事项）

| # | 事项 | 决策 | 理由 |
| --- | --- | --- | --- |
| 1 | Study / Settings 路由 | 底部标签栏只做 3 项：**首页 `/` / 题库 `/exams` / 错题本 `/mistakes`** | Settings 无对应页面，不放空入口；Study 先映射到错题本，将来有学习页再拆 |
| 2 | 深色模式 | **冻结**：保留 `.dark` 变量块并加注释，不切换、不自动反色 | 设计稿只有浅色；冷色 `.dark` 与暖白体系冲突，将来另出一套深色 token |
| 3 | 容器宽度 | 检索类页面（列表 / 详情 / 结果）**1280 + 留白 80**；**阅读区（练习页）保持 768** | 遵循 §7「阅读区例外」，长行可读性优先 |
| 4 | 新增数据字段（状态 / 进度 / 建议时长） | **不新增**：表格只列真实数据（年份 / 标题 / 操作） | 属数据契约变更而非样式工作；**宁可缺列也不造假数据** |
| 5 | 设计稿领先实现的功能（计时器 / 题号地图 / Submit Examination） | **本轮不做** | 是功能缺口，不是样式工作 |
| 6 | 衬线字体 | **系统 Georgia 回退**，不引入 `source-serif-4` | 零网络请求、零 FOUT；先验证方向，需要时再自托管 |

---

## 2. 已落地

### 🔴 必须重构（6/6）

| 项 | 落地方式 | 文件 |
| --- | --- | --- |
| M1 主题 Token | `:root` 全量替换为暖白 + 深墨绿体系；`@theme inline` 补 14 个扩展色映射；`--radius` 12px；圆角改显式取值（tile 7 / control 8 / card 12 / sheet 16） | `src/index.css` |
| M2 标题衬线 | `--font-heading` = `Georgia → Times New Roman → Source Serif 4 → PingFang SC / Microsoft YaHei`；`@layer base` 给 `h1-h3` 统一挂 `font-heading` + 负字距 | `src/index.css` |
| M3 Badge | 新建 `ui/badge.tsx`（5 变体 × 2 尺寸，色值取 §3.3 达标值）；替换 `MistakeCard` 内联徽章，结果页对错态同步改用 | `ui/badge.tsx`、`MistakeCard.tsx`、`PracticeResult.tsx` |
| M4 触控 44 | Button 新增 `md`(40) / `touch`(44) 两档；移动端主操作与 tab 用 `h-11 md:h-7/8` 补足；练习页操作下沉为 sticky 底部条 | `ui/button.tsx`、各页面 |
| M5 对比度 | 采用实测达标值 `#6A7571` / `#2C7958` / `#926511`；`subtle-foreground` 只用于 eyebrow / 占位符；所有状态徽章**带文字** | `src/index.css`、`ui/badge.tsx` |
| M6 App Shell | 新建 `layout/app-shell.tsx`：顶栏（Logo + EXAM ARCHIVE + 导航 + 头像 + 退出）+ 移动底部标签栏；路由包一层外壳，各页移除自带返回链接 | `layout/app-shell.tsx`、`router/index.tsx`、5 个页面 |

> **附加决策**：答题页是沉浸任务页，自带 sticky 操作条 → **在 `/practice/` 路由隐藏全局底部标签栏**，避免两条底栏打架。

### 🟡 建议重构（10/11）

| 项 | 落地 |
| --- | --- |
| S1 Card 规格 | `rounded-xl`→`rounded-lg`、`ring-foreground/10`→`border border-border`、内边距移动 16 / 桌面 20 |
| S2 容器与分栏 | 导出 `BROWSE_CONTAINER`（1280）/ `READING_CONTAINER`（768）；详情页 2:1（主栏 + 400 侧栏，移动并入主栏下方） |
| S3 列表表格化 | 桌面 `<table>`（Year / Paper / Action，eyebrow 表头）+ 移动卡片列表 |
| S4 详情信息结构 | eyebrow + 题量 Badge + Section 列表 + 侧栏「使用说明 / 题目页不含答案」 |
| S5 练习页操作条 | 移动端 sticky 底部条（上一题 / 下一题，44px），桌面回到内容流 |
| S6 结果页重排 | Hero 大分数 + 3 个 StatBlock（答对 / 答错 / 未作答）+ 「逐题回顾」 |
| S7 Progress | 新建 `ui/progress.tsx`（`role="progressbar"` + 6px 轨道 + 可选百分比） |
| S8 输入 / 筛选 | 搜索框（lucide 图标 + Input）+ 年份原生 `<select>`，**纯客户端过滤 17 套**，不改数据契约 |
| S9 骨架屏 | 去掉 `animate-pulse`，改静态边框占位 |
| S10 图标统一 | 列表页 chevron、搜索、底部导航改用 `lucide-react`（1.5 描边） |
| S11 深色模式 | 按决策**冻结**，不做 |

---

## 3. 刻意未做（不要当成遗漏）

1. **列表表格的「状态 / 进度」列** —— 需要 practice 侧聚合数据，`ExamPaper = id|year|title` 与查询白名单都不含。
   这是**功能缺口**，塞假进度是错的，因此本轮表格只有 3 列。
2. ~~**计时器 / 题号地图 / 提交整卷** —— 设计稿领先实现，属功能。~~ → **已于后续轮次补齐**，见 §7。
3. **首页 Recommended Papers / Performance** —— 同样缺数据。
4. **错题本 / 登录页** —— 设计稿无像素稿，按组件规格换皮，未自造稿。

---

## 4. 明确保留（重设计时最容易误伤的部分）

数据层与业务逻辑**一行未改**（`git status` 已确认 `services/`、`hooks/`、`lib/` 无改动）：

- 答案边界（列白名单 + DTO + 列级 REVOKE）、判分唯一出口 RPC `grade_practice_section`
- `canSubmit = hasChoiceItems || source_id.endsWith('-trans')`
- `answeredCount` 逐题判定（选过**或**标记过）
- 翻译「离线作答 + 在线标记」，撤销 = 真删行
- `onToggleTextAnswer` 未传则不渲染按钮
- 正确率按**已判分客观题**为分母
- 错题本两步查询、不写 `updated_at`、不做乐观更新、不展示答案
- `chart` 三态、`json-utils` 运行时窄化、passage/prompt 去重

---

## 5. 验证结果

| 门槛 | 结果 |
| --- | --- |
| `tsc -b` | 0 error |
| `pnpm lint`（oxlint） | 0 error（9 warning，其中 8 条为 `only-export-components` 既有告警，`badge.tsx` 沿用 `button.tsx` 同款导出形态） |
| `pnpm build` | 成功，CSS 42.48 kB（gzip 8.80） |
| 浏览器冒烟（1440 + 375） | **29/29**：暖白底色、衬线标题、顶栏/底栏显隐、桌面表格 vs 移动卡片、年份筛选、44px 触控、6 个页面均无横向溢出、console 0 错误 |
| 业务回归 | **8/8**：答题 → 提交判分 → 结果页渲染正确答案 → 错题自动收录 15 条 → 错题卡用 Badge → **结构级泄露扫描 0 命中（扫了 14 个载荷）** |
| 测试数据清理 | 线上读回 `mistakes/reviews/sessions/answers = 0/0/0/0` |

---

## 6. 后续（按优先级）

1. **补数据契约**：为列表加「状态 / 进度」需要 practice 侧聚合，建议作为独立需求评估（可能是一个新 RPC）。
2. **深色模式**：需要时单独出一套暖色深色 token，不要自动反色。
3. ~~**功能缺口排期**：计时器、题号地图、整卷提交 —— 设计稿已有，实现排期待定。~~ → **已落地**，见 §7。
4. **衬线字体升级**：若 Georgia 在 Windows 上的渲染不达预期，再自托管 `source-serif-4`（加 `font-display: swap`）。
5. **S7 Progress 尚未被页面使用**（当前无真实进度数据）；等第 1 项落地后在列表表格里启用。

---

## 7. 追加：整卷练习 + 练习页功能补齐（2026-09-17 后续轮）

**范围：** 首次让 `src/services/`、`src/hooks/` 产生改动（新增一个受控答案 RPC + 会话层查询参数），
以及新增整卷练习页与 3 个练习组件。视觉语言沿用 §2，未改 Token 与 `ui/` 既有组件。

### 7.1 用户提出的 7 条

| # | 问题 | 处理 |
| --- | --- | --- |
| 1 | 首页「开始学习」与「查看历年真题」跳到同一处 | 「开始学习」= 最新一套的**整卷练习**；「查看历年真题」= `/exams` 列表 |
| 2 | 详情页每个大题下都挂「开始练习」不合理 | 移除逐大题按钮，收敛为 header 里**一个**「开始整卷练习」 |
| 2.1 | 要列出题目序号 | `QuestionNavigator`：桌面右侧 300px sticky 分大题网格；移动端内容区上方横滚条 |
| 2.2 | 移动滑动切题 / PC 点序号切题 | `useSwipe`（阈值 60px、轴向容差 40px）；两侧都支持点击 |
| 2.3 | 需要一个「是否直接显示答案」的设置图标 | `PracticeSettings` 齿轮 + popover，`role="switch"`，**默认关闭** |
| 2.4 | 练习页要计时 | `useElapsedSeconds` + `TimerChip`；每 30s 写回 `elapsed_seconds` |
| 2.5 | 找不到整卷练习页 | **不是漏了**：`practice_sessions` 早有 `paper_id` + DB CHECK（`session_type='exam'` ⇒ paper_id 必填），判分 RPC 本就按 session 判 → 补页面即可，**无需新表** |
| 2.6 | 翻译 / 作文要有大输入框并记录 | `PracticeQuestion` 主观题分支渲染受控 `Textarea`（240px + 字数），700ms 防抖写 `practice_answers.text_answer`；结果页回显「我的作答」 |

### 7.2 答案边界**未放宽**（本轮最关键的一条）

「答题时显示答案」用的是**新增的窄口径 RPC**，不是把答案列加回白名单：

- `peek_item_answer(p_session_id, p_item_id)` —— SECURITY DEFINER + 校验 `auth.uid()` 归属，
  结果 **scoped 到该会话自身覆盖的 section / paper 范围**，且**一次只回当前这一题**。
- 常规表查询的列白名单、列级 `REVOKE` **一行未改**；冒烟里专项断言「`/rest/v1/<table>` 响应零命中
  `correct_option` / `explanation` / `source_data` / `passage_zh`」通过。
- 放宽的是「**什么时候**能看」，不是「能不能**批量**拿」。

另一个 DB 变更：`grade_practice_section` 的 `order by` 改为 `coalesce(es.sort_order, 0), si.item_no`
—— 整卷会话下 `item_no` 每大题从 1 重开，只按 `item_no` 排会串大题。**返回列未变 ⇒ 无需 drop/regrant。**

### 7.3 结构决定

- 整卷页拆成 **外层加载器 + 内层 `ExamPracticeBody`**：内层只在「试卷 + 会话都就绪」后挂载。
  这样计时/草稿这类「挂载即视为起点」的状态**不需要任何 effect 同步**，
  也就不必在 effect 里 `setState` 或把草稿写进依赖。
- 课件的乐观态：选项 / 标记 / 草稿三类本地 state 参与 `answeredIndices` 计算。
  只认服务端数据会让「点一下选项」等到网络回读才高亮。

### 7.4 验证

| 门槛 | 结果 |
| --- | --- |
| `tsc -b` / `pnpm lint` / `pnpm build` | 0 error / 0 error（10 warning 全是既有 `only-export-components`）/ ✅（ExamPracticePage 15.98 kB） |
| 浏览器冒烟（1440 + 375） | **21/21**：入口分流、整卷=1/逐大题=0、48 格题号 + 三态图例、点击与左滑切题、开关揭示答案、计时递增、240px 输入框 + 刷新后值一致、结果页回显「我的作答」、底部导航已隐藏、375px 无横向溢出、控制台 0 error |
| 答案边界回归 | 常规表查询零命中答案列；答案仅由 `peek_item_answer` / `grade_practice_section` 两个受控 RPC 下发 |
| 测试数据清理 | 线上读回本次窗口 `0 sessions / 0 answers`，`mistakes` 0 条 |

### 7.5 遗留

1. **`/exams/:paperId/practice/:sectionId` 目前没有 UI 入口**（逐大题按钮被否掉了），
   `PracticePage.tsx` 仍在但已孤立。保留待接「只练这一大题 / 错题重做」，或后续删除 —— 待定。
2. §6 第 1 项（列表「状态 / 进度」列）仍缺数据契约，未动。
3. `docs/pages/*.md` 与 `docs/development/decisions.md` 仍未回写本轮结论。
