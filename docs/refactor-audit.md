# 现状审查：现有实现 vs 设计稿

**状态：** 只读审查，**未修改任何代码**
**依据：** [`design-direction.md`](./design-direction.md) · [`design-system.md`](./design-system.md)
**审查范围：** `src/`（7 个页面、13 个组件、3 个 ui 基础件）+ `src/index.css` + 路由与依赖
**方法：** 逐文件读取现有实现 → 与设计稿的视觉语言 / 组件规格 / 响应式规则比对 → 按下述标准分级

---

## 1. 判定标准

| 级别 | 定义 | 判据 |
| --- | --- | --- |
| **🔴 必须重构** | 不做则设计系统不成立，或存在明确缺陷（可访问性 / 重复实现 / 与设计方向根本冲突） | 涉及 Token 根、被 ≥3 处复用、或违反 WCAG |
| **🟡 建议重构** | 提升还原度与一致性；不做系统也能跑，但会持续"差一口气" | 局部样式 / 单页信息结构 / 体验优化 |
| **🟢 无需修改** | 已符合设计方向，或属业务逻辑（与视觉无关），**改动反而有风险** | 数据层、判分逻辑、容错规则、工程约束 |

---

## 2. 结论摘要

| 级别 | 数量 | 一句话 |
| --- | --- | --- |
| 🔴 必须重构 | **6** | 主题 Token、标题字体、Badge 组件、触控尺寸、对比度与状态冗余、全局 App Shell |
| 🟡 建议重构 | **11** | 主要是"信息结构"层面：列表表格化、详情分栏、练习页操作条、结果页重排、容器宽度等 |
| 🟢 无需修改 | **14** | 数据链路、答案边界、判分逻辑、题库容错、错题本域、路由与工程约束 —— **全部保留** |

**总体判断：架构与业务逻辑是健康的，不需要动；要动的是"皮"和"信息结构"。**
现有代码里那些看起来啰嗦的判断（`canSubmit`、`answeredCount`、`chart` 三态、`source_id` 判翻译）
几乎都是踩过坑才写出来的，**严禁在重设计中被"简化"掉** —— 详见 §5 保留清单。

> ⚠️ **先说一个容易被忽略的事实**：设计稿只有 5 页（home / exam-list / exam-detail / practice / result），
> **没有错题本页与登录页**。这两页是后续功能新增，无像素稿 ——
> 它们的处理原则是"套用组件规格保持一致"，**不属于必须重构**，见 §6。

---

## 3. 🔴 必须重构（6 项）

### M1 · 主题 Token 重置 🔴

**现状证据**
- `src/index.css:56-87` —— `:root` 是 shadcn 默认：主色 `oklch(0.53 0.16 265)`（indigo）、底色纯白、一整套冷灰（hue 265）。
- 全局 `* { @apply border-border outline-ring/50 }`、`.dark` 同样为冷色体系。

**设计要求**：暖白 `#FAF9F6`、深墨绿 `#1F4A45`、暖灰描边 `#EBE8E2`（design-system §3）。

**为什么必须**：色板是整套视觉语言的地基。不换色，后面所有组件规格（徽章、进度、卡片）都无法成立；
而换色的**成本极低** —— `@theme inline` 已经把 `--color-*` 指向 `:root` 变量，**只改 `:root` 的值即可，不动任何组件**。

**动作**：按 design-system §3.4 片段替换 `:root`；同时调整 `--radius: 0.75rem`。
**影响文件**：`src/index.css`（1 个）。**风险**：低，纯视觉；`.dark` 暂冻结（见 M6 关联决策）。

---

### M2 · 标题字体切衬线 🔴

**现状证据**
- `src/index.css:9` —— `--font-heading: var(--font-sans)`，即**标题与正文同为 Geist 无衬线**。
- `font-heading` 已在 6 处使用（各页 `h1`、列表年份、Card 标题），说明**接入点已就绪，只差一个字族**。

**设计要求**：`display / h1-h3 / metric / 年份 / 题干` 全部衬线（design-system §4.1）。这是"档案馆感"最核心的一笔。

**为什么必须**：设计稿里标题、大数字（78 分）、年份（2026）全是衬线，换成无衬线等于丢掉一半的气质；
而这一项同样是**单点改动**（改 `--font-heading` 定义）。

**动作**
1. 引入可变衬线：`@fontsource-variable/source-serif-4`（或仅用系统回退 `Georgia`）。
2. `--font-heading` 改为 `衬线栈 + CJK 黑体回退`（**CJK 不要进 serif**，否则 Windows 落宋体）。
3. 按 design-system §4.2 对齐字号阶梯（现有 `text-3xl`(30px) 标题 → 移动 24 / 桌面 ≈44）。

**影响文件**：`src/index.css` + `package.json`（+1 依赖）+ 各页字号微调。**风险**：中 —— 衬线字体的度量与 Geist 不同，标题换行位置会变，需逐页目视一遍。

---

### M3 · 抽出 Badge 组件 🔴

**现状证据**
- `src/components/mistakes/MistakeCard.tsx:74-85` —— 状态徽章**内联实现**（`bg-destructive/10` 等 Tailwind 不透明度色）。
- 设计稿里徽章出现在 **4 类共 6+ 处**：列表状态（未开始/进行中/已完成）、详情 Section 状态、
  错题状态、结果页 `CORRECT: B` / `YOURS: A`。**现有只有 1 处，且配色是"透明度叠色"而非语义色对**。

**为什么必须**
1. 状态是产品的核心语汇（"我做到哪了 / 错在哪"），必须有**唯一实现**；
2. 现有 `bg-destructive/10` 这类写法依赖前景色，**换了主色/前景色后全部要重调**，属于典型的散落耦合；
3. 徽章色对的可访问性（4.29 / 4.14 未达标）只可能在**单一组件**里被统一修正。

**动作**：新建 `src/components/ui/badge.tsx`（4 态：neutral / warning / success / danger，含已修正的达标色值），
替换 `MistakeCard` 内联实现，并在后续列表/详情页复用。
**影响文件**：+1 新文件，`MistakeCard.tsx` 改 1 处。**风险**：低。

---

### M4 · 移动端触控尺寸 🔴

**现状证据**
- `src/components/ui/button.tsx:22-32` —— 尺寸档位 `h-6 / h-7 / h-8 / h-9`，**最大 36px**。
- 实际使用：练习页「上一题/下一题」、错题页「标记已掌握/移出错题本/撤销」、
  错题页分类 tab（`px-3 py-1.5 text-sm`，≈30px）—— **全部低于 44px 触控下限**。
- 练习页主操作在页面中部，移动端需滚动到底才能提交。

**设计要求**：触控目标 ≥ 44×44；移动端主操作 44 高并进入 sticky 底部条（design-system §5.3 / §9-10）。

**为什么必须**：这是可用性问题，不是审美问题 —— 44px 是 WCAG 2.5.5 与 iOS/Android 双端共识底线。

**动作**：Button 新增 `touch`（44）档位；移动端 tab / 操作按钮改用该档；练习页操作下沉为 sticky 条（见 S5）。
**影响文件**：`button.tsx`、`MistakesPage.tsx`、`PracticePage.tsx`。**风险**：低（新增档位，不改既有档位）。

---

### M5 · 对比度与"状态不能只靠颜色" 🔴

**现状证据**
- 设计稿采样值中 3 处未达 AA（已实测）：`muted #6F7B77` = 4.18、success on soft = 4.29、warning on soft = 4.14。
- 现有 `--muted-foreground: oklch(0.556 0.012 265)` 同样是"中间灰"，换到暖白底后需复核。
- 描边对比度 1.16 / 1.48 < 3 ⇒ **边框不能作为唯一状态线索**，而卡片/输入框目前正是靠描边区分。

**为什么必须**：可访问性底线，且**换色时若不一起修，会把不达标色固化进 Token**。

**动作**
1. 采用 design-system §3.3 的达标值（`#6A7571` / `#2C7958` / `#926511`）。
2. 徽章、错误提示、选中态一律**文字 + 颜色**双线索；选中态用主色 ring（9.39，合格）。
3. 限定 `--color-subtle-foreground` 仅用于占位符/装饰，不承载小字。
**影响文件**：`src/index.css` + M3 的 Badge。**风险**：低。

---

### M6 · 全局 App Shell（顶栏 / 底部标签栏）🔴

**现状证据**
- `src/router/index.tsx:37-75` —— 路由直接铺页面，**没有共享外壳**。
- 每个页面各自渲染「← 返回首页 / ← 历年真题」（`HomePage` 无、`ExamListPage:103`、`ExamDetailPage:139`、
  `MistakesPage:133`、`PracticePage`），**导航方式不统一**；
- 登录态无展示位（登出入口在首页）。

**设计要求**：顶栏（Logo + EXAM ARCHIVE 徽标 + 导航 + 头像）；移动端底部标签栏 4 项（design-system §8.12/§8.13）。

**为什么必须**：设计稿 5 页**全部**带顶栏，这是"产品有框架"与"几个独立页面"的分界；
且移动端底部标签栏是唯一能同时承载 4 个主入口的方案。

**动作**（可分两步，降低风险）
- **6a**：新建 `components/layout/app-shell.tsx`（顶栏，含 logo / 徽标 / 头像 / 登出），各页移除自带返回链接。
- **6b**：移动端底部标签栏（`Home / Exams / Study / Settings`）—— **需先决策 Study 指向 `/mistakes` 还是其它**（见 §7）。

**影响文件**：+2 新文件；5 个页面移除返回链接；`router/index.tsx` 包一层外壳。**风险**：中 —— 涉及导航方式变更，需回归全部跳转。

---

## 4. 🟡 建议重构（11 项）

| # | 项 | 现状 | 设计稿 | 影响 | 建议时机 |
| --- | --- | --- | --- | --- | --- |
| S1 | **Card 规格统一** | `rounded-xl`(16) + `ring-foreground/10`（冷灰） | 12px 圆角 + `1px #EBE8E2` | `card.tsx` + 全部用卡页面 | 紧随 M1 |
| S2 | **容器宽度与分栏** | 所有页 `max-w-3xl`（768）单栏 | 检索页 1280 + 2:1 分栏；**阅读区仍 768** | 列表/详情/结果页 | M6 之后 |
| S3 | **列表页表格化** | 卡片流：年份 + 名称 + 「开始练习」 | 桌面表格（年份/标题/状态/进度/Open）；移动卡片 | `ExamListPage.tsx` | S2 同期 |
| S4 | **详情页信息结构** | 标题 + 题数 + Section 罗列 + 每节「开始练习」链接 | 元信息（题量/时长/难度）+ Section 卡（含状态）+ 右侧 Instructions + 两个主按钮 | `ExamDetailPage.tsx` | S2 同期 |
| S5 | **练习页操作条** | 「上一题/下一题」在内容流内，32px | sticky 底部操作条（Mark / Previous / Next，44px）+ 章节进度 | `PracticePage.tsx` | M4 同期 |
| S6 | **结果页重排** | `PracticeResult`：文字化的正确率 + 逐题对错/答案/解析 | Hero 大分数 + 3 统计卡 + Section Breakdown + 错题回顾 | `PracticeResult.tsx` | S2 之后 |
| S7 | **Progress 组件化** | 无（若 S3 需要则现写内联） | 轨道 6px + 主色填充 + 百分比 | 新建 `ui/progress.tsx` | 与 S3 同期 |
| S8 | **输入 / 筛选控件** | 列表页无搜索与筛选；`ui/input.tsx` 存在但未被页面使用 | 搜索框 + 年份下拉（移动整宽） | `ExamListPage` + `ui/input.tsx` + Select | S3 同期 |
| S9 | **骨架屏去闪烁** | `ExamListPage:14`、`ExamDetailPage:94` 用 `animate-pulse` | 安静原则：静态骨架或纯文案（design-direction §9） | 2 处 | 任意 |
| S10 | **图标统一** | 手写 SVG（`ExamListPage:72` 的 chevron、`PracticePage` 的旗标） | 线性 1.5 描边；`lucide-react` 已在依赖中 | 3 处 | 任意 |
| S11 | **深色模式处置** | `.dark` 完整但设计稿无深色，且与暖白体系冲突 | 无 | `index.css` | 先决策（§7） |

> S3/S4/S6 会引入"状态 / 进度 / 建议时长"等**数据字段**，
> 现有数据契约（`ExamPaper = id|year|title`）与查询白名单并不包含它们 ——
> 这属于**功能缺口**而非样式工作，需另开议题评估（见 §7）。

---

## 5. 🟢 无需修改 —— 明确保留清单（14 项）

> 这一节是本次审查最重要的产出：**列出不要动的东西**。
> 这些代码大多承载了踩过坑的经验或被安全边界约束，视觉重设计时最容易被误伤。

### 5.1 架构与数据层（**完全保留**）

| # | 保留项 | 位置 | 为什么保留 |
| --- | --- | --- | --- |
| K1 | 分层数据链路 `Page → hooks → services → Supabase` | 全局 | service 是唯一访问 Supabase 的层，架构铁律 |
| K2 | 显式列白名单 `PAPER_LIST_SELECT` / `PAPER_DETAIL_SELECT` | `services/exams.ts` | 禁止 `*`；答案边界的第一道防线 |
| K3 | **答案边界**：DTO 不含 `correct_option/explanation/extra_data/source_data/passage_zh` | `services/exams.ts` + DB REVOKE | 安全红线，不可回退 |
| K4 | 判分唯一出口 RPC `grade_practice_section` + `PracticeResult` 为唯一渲染处 | `services/practice.ts` / `components/practice/PracticeResult.tsx` | 提交后按题下发，是刻意设计 |
| K5 | 排序契约（sections→`sort_order`、items→`item_no`、options→`option_index` 双保险） | `services/exams.ts` | `section_items` 无 sort_order，易踩错 |
| K6 | 查询键集中管理 `examKeys / practiceKeys / mistakeKeys` | `lib/constants.ts` | 失效范围可控 |
| K7 | 错误归一化 `toExam/Practice/MistakeErrorMessage` | 各 service | 页面只展示文案，不解读底层错误 |
| K8 | 路由懒加载 + `ProtectedRoute` + 路由参数 `:paperId` + UUID 预校验 | `router/index.tsx`、`ExamDetailPage.tsx:9` | 工程约束，与视觉无关 |

### 5.2 业务逻辑（**完全保留，且不要"简化"**）

| # | 保留项 | 位置 | 为什么保留 |
| --- | --- | --- | --- |
| K9 | `canSubmit = hasChoiceItems \|\| canRevealReference` | `PracticePage.tsx:251` | ⚠️ 用 `!hasChoiceItems` 会让写作题长出假提交按钮（已踩） |
| K10 | `answeredCount` 逐题判定（选过 **或** 标记过） | `PracticePage.tsx:225` | ⚠️ 用 `savedByItem.size` 会让翻译题计数恒 0、按钮永远禁用（已踩） |
| K11 | 翻译题「离线作答 + 在线标记」；撤销 = **真删行** | `PracticePage.tsx:171` / `PracticeQuestion.tsx` | 答案出口的唯一可达路径；只改 state 会让参考译文仍可见 |
| K12 | `onToggleTextAnswer` 未传则不渲染按钮 | `PracticeQuestion.tsx:42` | 防"点了没反应的死按钮" |
| K13 | 正确率**按已判分客观题**为分母 | `PracticeResult.tsx:43` | 未作答题不该拉低/抬高正确率 |
| K14 | 判分 RPC 内错题收录 + `UNIQUE` upsert + `removed` 复活 | 线上 RPC | 前端不写 `mistakes`（E2E 已验证前端写请求 = 0） |

### 5.3 题库容错渲染（**完全保留**）

| # | 保留项 | 位置 | 为什么保留 |
| --- | --- | --- | --- |
| K15 | `json-utils.ts` 运行时窄化 `extra_data`（**不用类型断言**） | `components/exams/json-utils.ts` | 结构是运行时数据，断言会骗人 |
| K16 | `chart` 三态（结构化对象 / 布尔 / 缺失）+ `chart_url` 分支 | `ExamSection.tsx:98-188` | 真实数据就是这样，写死必崩 |
| K17 | `passage`/`prompt` 与小题 `content` 的去重逻辑 | `ExamSection.tsx:82-87` | 避免"英文原文"渲染两遍 |
| K18 | 新题型 `titles` 池 + `letterOnly` | `ExamSection.tsx:92,209` | 2010 只有 2 个可选，其余 7 个 —— 不能写死 |
| K19 | 翻译判断走 `source_id.endsWith('-trans')` | `ExamSection.tsx:36` | ⚠️ 用中文 `type === '翻译'` 会漂移 |
| K20 | 主观题参考内容只在 `exam_sections.extra_data` 读（范文折叠） | `ExamSection.tsx:104,215` | 小题级 extra_data 已 REVOKE |

### 5.4 错题本域（**保留结构，仅换组件**）

| # | 保留项 | 说明 |
| --- | --- | --- |
| K21 | `services/mistakes.ts` 两步查询 + 「上次选择」回查 | 避开 PostgREST 多级嵌入的别名坑；`lastSelectedOption` 来自用户自己的 `practice_answers`，**不是答案** |
| K22 | **不写 `updated_at`** | `mistakes` 有 `mistakes_updated_at` 触发器，手写会掩盖真实更新时间 |
| K23 | 「错题页不展示答案与解析」的刻意取舍 | 展示即绕过判分出口；要看答案只能走"重做 → 判分" |
| K24 | **不做乐观更新**、失败就地报错 | 避免"界面说已掌握、库里还是未掌握" |
| K25 | `MistakesPage` 三视图 + 每卡独立 pending | 状态与交互逻辑正确，只需把徽章换成 M3 的 `Badge` |

### 5.5 已符合设计方向、无需改动的既有实践

| # | 项 | 说明 |
| --- | --- | --- |
| K26 | 状态视图文案风格（`StateCard` / `FullScreen` / `CenteredState`） | 与 design-system §8.16 一致（说清原因 + 下一步 + 归一化文案），**只换 Token 不换结构** |
| K27 | `role="alert"` / `aria-label` / `<fieldset><legend>` / `aria-live` | 现有 a11y 实践是对的，重设计时要**保留并推广** |
| K28 | 全局 `prefers-reduced-motion` 兜底 | `index.css:141`，与"安静"原则一致 |
| K29 | `focus-visible:ring-3 ring-ring/50` | 焦点环规范已就位，换主色后自动跟随 |

---

## 6. 设计稿未覆盖的页面：怎么办

| 页面 | 现状 | 建议 |
| --- | --- | --- |
| **错题本** `/mistakes` | Phase 7 新增，无像素稿；已用 Card + 内联徽章 + 三视图实现 | **结构保留**，按 design-system 换组件（`Badge` / 卡片规格 / 触控尺寸）即可；不要为了"对齐设计稿"去造一个不存在的稿 |
| **登录页** `/login` | 无像素稿 | 沿用暖白底 + 卡片 + 主色按钮；沿用现有 `react-hook-form` + `zod` 校验逻辑 |
| **404 / 未找到** | 无像素稿 | 沿用 `CenteredState` 文案风格 |

---

## 7. 未决事项（阻塞部分重构）

1. **Study / Settings 路由映射**（阻塞 M6b）：现有只有 `/`、`/exams`、`/mistakes`；
   Settings 无对应页面 —— 是新增、隐藏，还是先只做 3 项？
2. **深色模式**（阻塞 M1 收尾）：冻结 / 后续补 / 移除 `.dark`？暖白体系与现有冷色 `.dark` 冲突。
3. **容器宽度**（阻塞 S2）：检索页是否真的加宽到 1280？
4. **新增数据字段**（阻塞 S3/S4/S6）：状态、进度、建议时长、Section 状态 ——
   现有 `ExamPaper = id|year|title` 与查询白名单不含这些，**是数据契约变更，不是样式工作**。
5. **设计稿领先实现的功能**：计时器、题号地图、Submit Examination —— 是否排期？
6. **衬线字体**：引入 `source-serif-4`（+资源）还是仅用系统 `Georgia` 回退？

---

## 8. 建议执行顺序（依赖排序）

```
M1 主题 Token ──┬── M3 Badge（用达标色值）
                ├── M5 对比度修正
                └── S1 Card 规格
M2 标题字体 ────── 逐页目视换行
M4 触控尺寸 ──┬── S5 练习页 sticky 操作条
              └── MistakesPage tab / 按钮换档
M6a App Shell（顶栏）── M6b 底部标签栏（需先决策 Study 映射）
S2 容器/分栏 ──── S3 列表表格化 ──── S4 详情重构
                                  └── S6 结果页重排
S7/S8/S9/S10 可并行
S11 深色模式（决策后）
```

**每一步的回归门槛**：`tsc -b` → `pnpm lint` → `pnpm build` → 375px 无横向溢出 → console/pageerror = 0。

---

## 9. 逐文件判定总表

| 文件 | 判定 | 说明 |
| --- | --- | --- |
| `src/index.css` | 🔴 必须 | 色板 / 字体 / 圆角 / 对比度（M1、M2、M5） |
| `src/components/ui/button.tsx` | 🔴 必须 | 缺 44 触控档（M4）；变体配色需对齐 `soft` |
| `src/components/ui/card.tsx` | 🟡 建议 | 圆角 16→12、`ring-foreground/10` → `--border`（S1） |
| `src/components/ui/input.tsx` | 🟡 建议 | 样式对齐 + 补 Select（S8） |
| `src/components/ui/badge.tsx` | 🔴 必须（新建） | M3 |
| `src/components/ui/progress.tsx` | 🟡 建议（新建） | S7 |
| `src/components/layout/app-shell.tsx` | 🔴 必须（新建） | M6 |
| `src/router/index.tsx` | 🔴 必须 | 包 App Shell（M6）；**懒加载与路由结构保留** |
| `src/pages/HomePage.tsx` | 🟡 建议 | 缺 Recommended Papers / Performance；按钮与排版换皮 |
| `src/pages/ExamListPage.tsx` | 🟡 建议 | 表格化 + 状态/进度 + 搜索筛选（S3/S8）；骨架屏去闪烁（S9） |
| `src/pages/ExamDetailPage.tsx` | 🟡 建议 | 元信息 + Section 卡 + Instructions 分栏（S4）；**UUID 预校验保留** |
| `src/pages/PracticePage.tsx` | 🟡 建议 | sticky 操作条（S5）；**`canSubmit`/`answeredCount`/标记逻辑全部保留** |
| `src/pages/MistakesPage.tsx` | 🟡 建议 | tab 换 44 档（M4）；**三视图与状态逻辑保留** |
| `src/pages/LoginPage.tsx` | 🟡 建议 | 仅换皮 |
| `src/pages/NotFoundPage.tsx` | 🟢 无需 | 沿用 `CenteredState` |
| `src/components/practice/PracticeResult.tsx` | 🟡 建议 | 重排为 Hero + 统计卡（S6）；**正确率口径与答案出口保留** |
| `src/components/practice/PracticeQuestion.tsx` | 🟢 无需 | 交互与守卫逻辑正确，换 Token 即可 |
| `src/components/exams/ExamSection.tsx` | 🟢 无需（结构） | 容错逻辑全保留；仅 Section 卡样式随 S4 调整 |
| `src/components/exams/{ChoiceQuestion,TextQuestion,PassageText}.tsx` | 🟢 无需（结构） | 仅换 Token + 行高 |
| `src/components/exams/json-utils.ts` | 🟢 无需 | 运行时窄化，不要改成断言 |
| `src/components/mistakes/MistakeCard.tsx` | 🟡 建议 | 徽章换 `Badge`（M3）；**"不展示答案"与"我上次选的"保留** |
| `src/services/*.ts`、`src/hooks/*.ts` | 🟢 无需 | 数据层与业务逻辑，**本次重设计完全不触碰** |
| `src/lib/constants.ts` | 🟢 无需 | 查询键保留；如需可增 UI 常量 |
| `src/types/database.ts` | 🟢 无需 | codegen 产物，不手改 |

---

**审查日期：** 2026-09-17 · **结论：** 6 必须 / 11 建议 / 14 保留 · **未修改任何代码**
