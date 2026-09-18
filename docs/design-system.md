# Design System（草案）

**状态：** 草案 · 仅分析输出，**未修改任何代码**
**上游：** [`design-direction.md`](./design-direction.md)（设计方向与原则）
**输入源：** `svgs/*.svg`（桌面 1440）+ `svgs/mobile/*.svg`（移动 375）
**目标读者：** 后续做 UI 落地的人（人 / Agent）

---

## 1. 这份文档怎么用

1. **改视觉先看 §3–§7**（颜色 / 字体 / 间距 / 圆角 / 栅格）—— 全部是 Token，改 `src/index.css` 即可生效。
2. **写页面先查 §8**（组件规格）—— 每个组件给了构成、尺寸、状态与 Token 引用。
3. **做适配查 §9**（响应式规则总表）—— 桌面 → 移动的逐组件映射。
4. **动手前查 §11–§12**（代码映射 + 迁移顺序）—— 知道改哪个文件、按什么顺序改。

**标注约定：**

| 标记 | 含义 |
| --- | --- |
| 精确值 | 来自移动端设计稿（手写 SVG，坐标可查） |
| `≈` | 桌面稿视觉采样估算，落地时以设计稿为基准核对一次 |
| `⚠️` | 有陷阱 / 已发现问题 |
| `🔲` | 现有代码缺失，需要新建 |
| `✅` | 已落地（代码已实现） |

---

## 2. 采样方法与精度说明

- 移动端 5 份稿是**已知精确坐标**的手写 SVG，其中的间距、字号、控件高度可直接作为规格。
- 桌面 5 份稿是矢量路径（字已转曲），字号/字重为视觉估算，标 `≈`。
- 颜色由渲染图取色 + 移动端稿交叉验证；**对比度为脚本实测**（sRGB → OKLCH → WCAG 2.1 公式）。
- 桌面栅格：画布 1440，**内容宽 1280，左右留白 80**；详情页主栏 `≈840`、侧栏 `≈400`、间距 `≈40`。

---

## 3. 颜色

### 3.1 基础与中性色

| Token（建议名） | Hex | OKLCH | 用途 |
| --- | --- | --- | --- |
| `--color-background` | `#FAF9F6` | `oklch(0.982 0.004 91)` | 页面底色（暖白纸感） |
| `--color-surface` / `--color-card` | `#FFFFFF` | `oklch(1 0 0)` | 卡片、顶栏、抽屉 |
| `--color-foreground` | `#1A2626` | `oklch(0.258 0.017 196)` | 主文字（墨黑，带极轻绿调） |
| `--color-muted-foreground` ⚠️ | `#6A7571` | `oklch(0.552 0.015 172)` | 次要文字（**已修正，见 §3.3**） |
| `--color-subtle-foreground` | `#8A948F` | `oklch(0.657 0.014 165)` | **仅装饰/占位符/图标**，不可承载小字 |
| `--color-border` | `#EBE8E2` | `oklch(0.932 0.009 85)` | 卡片与分隔线 |
| `--color-border-strong` / `--color-input` | `#D8D4CC` | `oklch(0.871 0.012 85)` | 输入框、描边按钮 |
| `--color-track` | `#E8E6E0` | `oklch(0.925 0.008 92)` | 进度条轨道 |
| `--color-passage` | `#3A4744` | `oklch(0.385 0.018 180)` | 篇章正文（比主文字略柔，长时间阅读） |

### 3.2 主色与语义色

| Token | Hex | OKLCH | 亮底变体（`-soft`） | 用途 |
| --- | --- | --- | --- | --- |
| `--color-primary` | `#1F4A45` | `oklch(0.377 0.049 185)` | `#E4EEEB` / 描边 `#C9DCD7` | 主按钮、链接、当前项、年份强调 |
| `--color-primary-hover` | `#173B37` | `oklch(0.325 0.042 186)` | 选中底 `#F2F7F5` | hover / active |
| `--color-success` ⚠️ | `#2C7958` | `oklch(0.519 0.093 162)` | `#E3F1EA` | 已完成、答对、正确率 |
| `--color-warning` ⚠️ | `#926511` | `oklch(0.541 0.108 76)` | `#FBF0D9` | 进行中 |
| `--color-danger` | `#B04A3E` | `oklch(0.541 0.136 29)` | `#F9E9E6` | 错误、你的错误选项、破坏性操作 |

中性徽章：`bg #F0EEE9` + `fg #5B6663`（未开始 / 默认）。

### 3.3 可访问性修正（**已实测**）

| 组合 | 原值 | 实测对比度 | 结论 | 采用值 | 修正后 |
| --- | --- | --- | --- | --- | --- |
| 次要文字 on 暖白 | `#6F7B77` | **4.18** | ✗ 未达 AA 正文 | `#6A7571` | **4.54** ✅ |
| success 文字 on success-soft | `#2E7D5B` | **4.29** | ✗ 徽章小字 | `#2C7958` | **4.53** ✅ |
| warning 文字 on warning-soft | `#9A6B12` | **4.14** | ✗ 徽章小字 | `#926511` | **4.54** ✅ |
| danger 文字 on danger-soft | `#B04A3E` | 4.58 | ✅ | 保持 | 4.58 |
| subtle on 暖白 | `#8A948F` | **2.97** | ✗ 不可用于小字 | 保持，限定装饰用途 | — |

已达标组合（无需改）：`ink/background 14.78`、`white/primary 9.89`、`primary/background 9.39`、
`primary/primary-soft 8.35`、`passage/surface 9.70`、`neutral fg/neutral bg 5.14`。

> ⚠️ **描边不是状态线索**：`border on background = 1.16`、`border-strong on surface = 1.48`，远低于 3:1。
> 卡片边界、输入框边界属于"可见即可"，但**选中/错误/进行中等状态必须有第二个线索**（文字、图标或 ≥3:1 的边框 —— 选中态用主色 `#1F4A45` 时是 9.39，合格）。

### 3.4 推荐落地片段（**草案，未执行**）

```css
/* src/index.css —— 仅示意，尚未应用 */
@theme {
  --font-sans: 'Geist Variable', -apple-system, BlinkMacSystemFont, 'Segoe UI',
    Roboto, 'PingFang SC', 'Microsoft YaHei', 'Helvetica Neue', Arial, sans-serif;
  --font-heading: 'Source Serif 4 Variable', Georgia, 'Times New Roman',
    'PingFang SC', 'Microsoft YaHei', serif;   /* CJK 回退用黑体，避免宋体 */

  --color-background: oklch(0.982 0.004 91);
  --color-foreground: oklch(0.258 0.017 196);
  --color-card: oklch(1 0 0);
  --color-border: oklch(0.932 0.009 85);
  --color-input: oklch(0.871 0.012 85);
  --color-muted: oklch(0.98 0.004 91);
  --color-muted-foreground: oklch(0.552 0.015 172);
  --color-subtle-foreground: oklch(0.657 0.014 165);

  --color-primary: oklch(0.377 0.049 185);
  --color-primary-foreground: oklch(1 0 0);
  --color-primary-hover: oklch(0.325 0.042 186);
  --color-primary-soft: oklch(0.941 0.011 176);
  --color-primary-soft-border: oklch(0.879 0.021 178);

  --color-success: oklch(0.519 0.093 162);
  --color-success-soft: oklch(0.946 0.018 165);
  --color-warning: oklch(0.541 0.108 76);
  --color-warning-soft: oklch(0.958 0.033 86);
  --color-danger: oklch(0.541 0.136 29);
  --color-danger-soft: oklch(0.946 0.018 30);

  --radius: 0.75rem;   /* 12px：卡片 */
}

:root {
  --color-passage: oklch(0.385 0.018 180);
  --color-track: oklch(0.925 0.008 92);
  --ring: var(--color-primary);
}
```

---

## 4. 排版

### 4.1 字族

| Token | 值 | 用途 |
| --- | --- | --- |
| `--font-heading` | `Source Serif 4` → Georgia → Times → `PingFang SC` / `Microsoft YaHei` | Logo、所有标题、题干、大数字、年份 |
| `--font-sans` | `Geist Variable` → 系统栈 → `PingFang SC` / `Microsoft YaHei` | 正文、按钮、标签、表格 |
| `font-mono` | `ui-monospace` / `SFMono` | 计时器数字（可选，保持等宽） |

### 4.2 字号阶梯

| 级别 | 字体 | 桌面 | 移动 | 行高 | 字重 | 字距 | 用途 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `display` | serif | `≈64px` | 24px | 1.06 / 1.33 | 500 | -0.01em | 首页 Hero |
| `h1` | serif | `≈44px` | 24px | 1.18 / 1.33 | 600 | -0.01em | 页面标题（Examination Archive、试卷标题） |
| `h2` | serif | `≈32px` | 19px | 1.25 / 1.37 | 600 | 0 | 区块标题（Examination Sections、Section Breakdown） |
| `h3` | serif | `≈22px` | 17–19px | 1.27 / 1.35 | 600 | 0 | 卡片标题、题干（练习页） |
| `body-lg` | sans | `≈15px` | 12.5px | 1.6 | 400 | 0 | 引导性说明 |
| `body` | sans | `≈13.5px` | 12–12.5px | 1.6 | 400 | 0 | 正文、列表标题 |
| `body-sm` | sans | `≈12px` | 11–11.5px | 1.55 | 400 | 0 | 次级说明、选项文字 |
| `caption` | sans | `≈11px` | 10–10.5px | 1.5 | 400 | 0 | 元信息、图例 |
| `eyebrow` | sans | `≈10px` | 9.5–10.5px | 1.4 | 700 | **`+1.0~1.2px`** | 全大写小标签（EXAMINATION PERFORMANCE、QUESTION 12 OF 61） |
| `metric` | serif | `≈48px` | 40–46px | 1 | 600 | 0 | 分数、统计大数 |
| `numeral` | sans | 同 body | 同 body | 1 | 600 | 0 | **必须 `tabular-nums`**（百分比、题号、计数） |

- **正文永远不用衬线**（长英文阅读下无衬线更稳，且与设计稿一致）。
- **字母间距**：仅 `eyebrow` 用正字距；标题用轻微负字距（-0.01em）。**不要**给正文加字距。
- `⚠️` 现有 `Card` 的 `text-sm` 与页面 `text-3xl`（30px）标题需按上表对齐。

### 4.3 中英混排
- 标题：**拉丁衬线 + 中文黑体**（CJK 回退不进 serif，避免 Windows 宋体）。
- 正文：中文与英文同一无衬线栈，中文行高可 +2px。
- 数字与英文之间加 1/4 空格不是必须，但**数字一律 `tabular-nums`**。

---

## 5. 间距与尺寸

### 5.1 间距刻度（4pt）

```
4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80
```

| 场景 | 桌面 | 移动 |
| --- | --- | --- |
| 页面左右留白 | 80 | **20**（= 现有 `px-5`，无需改） |
| 页面顶部/底部留白 | 64 / 80 | 48（`py-12`） |
| 区块之间 | 40 | 32 |
| 卡片之间 | 16 | 12 |
| 卡片内边距 | 20–24 | 16 |
| 卡片内元素间距 | 12 | 8–12 |
| 按钮之间 | 12 | 12（并排）/ 10（纵排） |
| 标签与内容之间 | 8 | 8 |

### 5.2 控件高度（仅 4 档）

| 档位 | 高度 | 用途 |
| --- | --- | --- |
| `chip` | 18–26 | 徽章、计时胶囊、小标签 |
| `sm` | 32 | 卡片内次要按钮（Open / Practice） |
| `md` | 40 | 页面级按钮、输入框、选择器 |
| `touch` 🔲 | **44** | **移动端主操作、底部操作条**（现有 Button 最大 36px，缺此档） |

> ⚠️ 现有 `button.tsx` 的 `size` 为 `h-6 / h-7 / h-8 / h-9`，**全部低于 44**，移动端需新增 `touch` 档。

### 5.3 触控与命中区
- 最小 **44×44**；视觉尺寸不足时用透明 padding 补足（如题号格子视觉 38px，实际行距 42px）。
- 相邻可点击元素间距 ≥ 8px。
- 移动端底部操作条内的按钮允许 40px 高 + 条内上下留白 8px（总命中 56px）。

---

## 6. 圆角 / 描边 / 阴影 / 层级

| 项 | 值 | 用途 |
| --- | --- | --- |
| `radius-card` | **12px** | 卡片、抽屉内容块 |
| `radius-control` | **8px** | 按钮、输入框、下拉 |
| `radius-badge` | **4–6px** | 徽章、小标签 |
| `radius-pill` | `999px` | 计时胶囊、顶部指示条 |
| `radius-tile` | **7px** | 题号格子 |
| `radius-sheet` | **16px**（仅顶部两角） | 底部抽屉 |

- 描边：`1px solid var(--color-border)`；**选中态用 `1.5px` 主色 `ring`**（用 ring/outline 实现，避免布局跳动）。
- 阴影两级：
  - `sm` `0 1px 2px rgb(26 38 38 / 5%)` —— 卡片悬浮
  - `md` `0 -8px 24px rgb(26 38 38 / 12%)` —— 底部抽屉 / 弹层
  - **常规卡片不加阴影**（设计稿如此，是"纸面"感的关键）
- 层级：内容 0 / 顶栏 10 / sticky 操作条 20 / 遮罩 30 / 抽屉 40 / Toast 50。

---

## 7. 栅格与断点

| 断点 | 范围 | 容器 | 栏数 | 留白 |
| --- | --- | --- | --- | --- |
| `mobile` | `<768` | 100% | 1 | 20 |
| `tablet` | `768–1023` | 100% | 1（侧栏并入主栏） | 40 |
| `desktop` | `≥1024` | `1280` | 主 8 + 侧 4（≈840 : 400，间距 40） | 80（左右自动居中） |

- **阅读区例外**：题干 / 篇章 / 解析保持 `720–768px`（长行可读性），不随检索页一起加宽。
- 现有 `max-w-3xl`（768）恰好等于阅读区宽度 —— 若不加宽，视觉依然成立，只是丢失设计稿的分栏信息密度。

---

## 8. 组件规格

> 状态简写：`rest` / `hover` / `active` / `focus` / `disabled` / `selected`

### 8.1 Button

| 变体 | 背景 | 文字 | 描边 | 用途 |
| --- | --- | --- | --- | --- |
| `primary` | `primary` | `white` | — | 主操作（Start Learning / Open / Next Question / Continue Learning） |
| `soft` | `primary-soft` | `primary` | `primary-soft-border` | 卡片内次要操作（Practice）、已选中态 |
| `outline` | `surface` | `foreground` | `border-strong` | 次级操作（Browse Archive / Open 已完成 / Reset Progress / Review Mistakes） |
| `danger` | `danger-soft` | `danger` | — | 破坏性操作（Reset、移出） |
| `link` | 透明 | `primary` | — | 文字链（返回、查看详情） |

- hover：`primary → primary-hover`；`outline → 背景 muted`；`soft → 背景 #F2F7F5`。
- active：整体 `translate-y-px`（现有 button 已有，保留）。
- focus：`ring-3 ring-ring/50`（现有已实现，保留）。
- disabled：`opacity-50 pointer-events-none`（现有已实现）。
- 字体：`sans 13/13.5px 600`，高度 `sm 32 / md 40 / touch 44`。
- **移动**：并排按钮 → 全宽纵排（`w-full`，间距 10）。
- 映射：现有 `button.tsx` 已覆盖 primary/outline/secondary/ghost/destructive/link，**缺 `touch` 尺寸**与 `soft` 的精确配色。

### 8.2 Card 🔲（规格细化）
- 构成：`surface` + `1px border` + `radius 12` + 内边距 20（移动 16）；**无阴影**。
- 现状：`card.tsx` 用 `ring-1 ring-foreground/10` 与 `rounded-xl`（16px）→ 需改为 `--border` 与 12px。
- 内部节奏：标题行 → 12 → 内容 → 12 → 分隔线 → 12 → 操作区。
- 可点击卡片：hover 时 `border-strong` + 极轻阴影 `sm`。

### 8.3 Badge 🔲（现有无此组件，页面各写各的）
| 状态 | 底 | 字 | 文案 |
| --- | --- | --- | --- |
| `neutral` | `#F0EEE9` | `#5B6663` | 未开始 / Not Started |
| `warning` | `#FBF0D9` | `#926511` | 进行中 / In Progress |
| `success` | `#E3F1EA` | `#2C7958` | 已完成 / Completed / CORRECT |
| `danger` | `#F9E9E6` | `#B04A3E` | YOURS（错误选项） |

- 尺寸：高 19，内边距 `0 8`，`radius 4`，字号 9/9.5 **700**，字距 +0.2px。
- **必须带文字**（颜色单独不足以传达状态，见 §3.3）。
- 映射：`MistakesPage.tsx` 与 `ExamListPage.tsx` 各有一处内联实现 → 抽为 `src/components/ui/badge.tsx`。

### 8.4 ProgressBar 🔲
- 轨道 `#E8E6E0` 高 6（移动 5–6）`radius 3`；填充 `primary`；百分比文字在右侧（`tabular-nums`）。
- 桌面置于表格单元内（宽 ≈170），移动端置于卡片底部整宽。
- a11y：`role="progressbar"` + `aria-valuenow/min/max` + `aria-label`。

### 8.5 Input / Select 🔲
- 高 40（移动）/ 36–40（桌面），`radius 8`，`1px border-strong`，背景 `surface`。
- 占位符用 `--color-subtle-foreground`（**不可用 muted 以下**）。
- 搜索框左侧带 16px 线性放大镜；下拉右侧带 chevron。
- 移动端：整宽（335），与上方控件间距 12。
- 映射：`src/components/ui/input.tsx` 存在，**缺 Select**（可用原生 `<select>` + 同款样式，避免引入重型组件）。

### 8.6 Table（桌面）→ CardList（移动）
- **桌面表格**：表头 `eyebrow` 全大写字距 1px，色 `subtle-foreground`；行高 ≈78；行分隔 `1px border`；
  列：年份（衬线 14 700 primary）| 标题（13 600）| 状态徽章 | 进度条 + 百分比 | 操作按钮（右对齐）。
- **移动卡片**（推荐同步保留）：年份行 + 徽章 → 标题（最多 2 行）→ 进度条 + 百分比 + 按钮。
- 这是 **§9 响应式规则里最重要的一条**：不是缩放，是换结构。

### 8.7 PaperRow / SectionCard
- 左：圆形序号徽记（直径 36，`primary-soft` 底 + 衬线 14 700 `primary`）或年份方块（48×48，`radius 8`）。
- 右：标题（12.5–13 600）+ 2 行描述（10.5–11，`muted-foreground`）+ 右上角状态徽章。
- 移动要点：标题**不要**带 "Section N:" 前缀（会与右侧徽章相撞，序号已由圆形徽记表达）—— 已在移动稿中验证。

### 8.8 QuestionOption
- 高 58（移动，含 2 行文字）/ ≈56（桌面），`radius 8`，`1px border-strong`。
- 结构：单选圆（直径 16，圆心距左 20）+ 字母标签（`A.` 12 700）+ 正文（11.5–12）。
- 状态：
  - `rest` 白底 + `border-strong`
  - `selected` 底 `#F2F7F5` + `1.5px primary` ring + 圆圈填充 `primary` 内含 6px 白点
  - `correct`（结果态）绿底描边 + 文字 `success`
  - `wrong`（结果态）红底描边 + 文字 `danger`
- a11y：用原生 `<input type="radio">`（现有实现已如此，保留）+ `<fieldset>/<legend>`。

### 8.9 QuestionTile（题号格子）
- 38×38，`radius 7`，字号 11 600；行/列间距 8（移动 7 列）。
- 三态：`unanswered` `#F0EEE9`/`#5B6663`、`answered` `#E4EEEB`/`primary`、`current` `primary`/`white`。
- 命中区 ≥44（用行距补足）。
- **必须有图例**（三色 + 文字），不能只靠颜色。
- 现状：🔲 代码无此能力（设计稿领先实现，见 design-direction §13）。

### 8.10 TimerChip
- 胶囊 `radius 999`，高 26，背景 `primary-soft`，内容：16px 时钟描边图标 + `01:14:22`（11.5 600 `primary`，`tabular-nums`）。
- 位于练习页右上角；移动端与"退出"同行右对齐，标题下移到第二行（避免撞车）。

### 8.11 StatBlock
- 桌面：卡片内，标签 `eyebrow` 两行 + 数值 24–28 700。
- 移动：一行三列压缩版，卡片 105×72，标签 8 700（两行），数值 16 700。
- 数值一律 `tabular-nums`；正向指标（正确数、正确率）用 `success`。

### 8.12 TopBar 🔲（App Shell 的一部分）
- 高 56，`surface` + 底部 `1px border`。
- 左：Logo `English2`（衬线 21 700 #17332F）+ `EXAM ARCHIVE` 胶囊（8 700 字距 1.2）。
- 中（桌面）：导航链接（Home / Exams / Study / Settings），当前项 `primary` + 2.5px 顶部指示条。
- 右：头像圆形 28（`primary-soft` 底 + 首字母 10 700 `primary`）。
- 现状：**完全缺失**，页面只有「← 返回首页」链接。

### 8.13 BottomTabBar 🔲（移动端）
- 高 56 + 安全区 12，`surface` + 顶部 `1px border`；4 项等分（93.75 宽）。
- 图标 16 线性 + 标签 10；当前项**靠颜色 + 图标体量高亮**：激活 `primary`（图标更大更粗、标签加粗），未激活 `subtle-foreground`——**不用底色块、不用指示条**（与桌面顶栏的下划线指示条区分）。
- 语义：`<nav>` + `aria-current="page"`。
- ⚠️ 入口映射待决策：Home `/`、Exams `/exams`、**Study = ?（错题本 `/mistakes`？）**、Settings（无路由）。

### 8.14 Sheet（底部抽屉）✅
- 顶部两角 16 圆角，拖拽把手 36×4 居中，遮罩 `rgb(26 38 38 / 40%)`。
- 内容节奏：标题 → 进度标签 + 细进度条 → 题号网格 → 图例 → **底部主按钮**（距底 8）。
- 高度 ≤ 屏高的 55%，保证底层内容仍可见。
- a11y：`role="dialog"` + `aria-modal` + 焦点陷阱 + Esc 关闭。
- **落地（2026-09-18）**：`ui/sheet.tsx`（封装 Base UI `Dialog`，非 Drawer——免 swipe CSS 且自带焦点陷阱/Esc/滚动锁）+ `practice/AnswerSheet.tsx`（7 列题号网格 + 进度 + 图例 + 底部提交）；入口是移动端底部操作条中间的「答题卡」按钮。⚠️ 实际用 `max-h-[80vh]`（整卷题多，55% 会挤），与上面的 55% 建议值有出入，待后续按真机手感定档。

### 8.15 Divider / SectionHeader
- 分隔：`1px border`（区块间）/ `#F0EEE9`（卡片内）。
- 区块标题：衬线 19 600，距上 32、距下 16（移动）。
- `eyebrow` 用于分组标签（SECTION 2 PROGRESS、QUESTION 12 OF 61）。

### 8.16 状态视图（Empty / Loading / Error）
| 态 | 文案风格 | 视觉 |
| --- | --- | --- |
| Loading | 「正在加载…」单行，`muted-foreground`，占满一屏或卡片位 | 无 spinner 动画（与"安静"一致）或极轻旋转 |
| Empty | 说清**空的原因 + 下一步**，如「还没有未掌握的错题」 | 卡片内居中，配 outline 按钮 |
| Error | 归一化中文文案，**不含** PGRST/http/Supabase 细节 | `role="alert"`，`text-destructive`，配「重新加载」 |

- 移动稿/现有代码已按此实现（`StateCard` / `FullScreen`），保留即可，只需换 token。

### 8.17 Chip / Avatar
- Chip：高 19–26，`radius 4–6`，`primary-soft` 或 `#F0EEE9` 底，字号 8–11 700。
- Avatar：28（顶栏）/ 36，圆形，`primary-soft` 底 + `primary` 首字母 10–12 700。

---

## 9. 响应式规则总表

| # | 组件 / 区域 | 桌面（≥1024） | 移动（<768） | 规则 |
| --- | --- | --- | --- | --- |
| 1 | 顶部导航 | 顶栏内横向导航 | **底部标签栏**（56+安全区） | 导航下沉，主操作触手可及 |
| 2 | 试卷索引 | **表格**（年份/标题/状态/进度/操作） | **卡片列表**（每行一卡） | 换结构，不缩放 |
| 3 | 侧栏 Instructions | 右栏 `≈400` 固定 | **下移为主栏下方整宽卡片** | 侧栏并入主栏 |
| 4 | 侧栏 Question Map | 右栏常驻 | **底部抽屉**（题号格 7 列 + 图例 + 提交） | 收纳为抽屉 |
| 5 | 侧栏 Your Performance | 首页右栏 | 首页最下方整宽卡片 | 同 #3 |
| 6 | 结果页 Breakdown / 错题回顾 | 左右 2:1 双栏 | 上下纵排 | 同 #3 |
| 7 | 页面容器 | 内容 1280，留白 80 | 100%，留白 20 | 只加宽检索页，阅读区保持 768 |
| 8 | 按钮组 | 并排（间距 12） | **全宽纵排**（间距 10，高 44） | 触达优先 |
| 9 | 输入框 / 选择器 | 并排半宽 | 整宽纵排 | 同 #8 |
| 10 | 练习页操作区 | 题干下方横排 | **sticky 底部操作条**（56） | 高频操作下沉 |
| 11 | 练习页元信息 | 头部一行（章节 + 计时） | 两行（标题 / 章节·计数），计时右上胶囊 | 换行避免撞车 |
| 12 | 长标题 | 单行或自然换行 | 最多 2 行，**去掉可推断的前缀** | 防止与右侧徽章重叠 |
| 13 | 大分数 | Hero 卡右侧对角 | Hero 卡右上角（与眉标同行） | 避免与标题相撞 |
| 14 | 统计卡 | 一行三张（等宽） | 一行三张**压缩版**（标签两行） | 保持并排但缩小字号 |
| 15 | 状态徽章 | 行内右对齐 | 卡片顶行右对齐 | 位置一致，尺寸不变 |
| 16 | 题号格子 | 5–7 列网格 | 7 列网格（38px） | 保持网格，重排行数 |
| 17 | 卡片内边距 | 20–24 | 16 | 收紧 |
| 18 | 区块间距 | 40 | 32 | 收紧 |

---

## 10. 可访问性规范

1. **对比度**：正文 ≥ 4.5，大字（≥24px 或 ≥19px 粗体）与非文本 UI ≥ 3（§3.3 已全量实测）。
2. **焦点**：统一 `ring-3 ring-ring/50`，`outline-none` 仅在有 ring 时使用；键盘可达全部交互元素。
3. **触控**：≥ 44×44；相邻可点元素间距 ≥ 8。
4. **不靠颜色单独传达信息**：徽章带文字、选中态带边框、错误态带图标或文字。
5. **语义**：`<nav>` / `<main>` / `<ul><li>` / `<fieldset><legend>` / `role="alert"` / `role="progressbar"` / `aria-current`。
6. **动效**：尊重 `prefers-reduced-motion`（现有 `index.css` 已全局兜底，保留）。
7. **缩放**：字号用 `rem`，允许系统字号放大 200% 不破版。
8. **表单**：每个输入有可见 label 或 `aria-label`；错误用 `aria-invalid` + `role="alert"`。

---

## 11. 与现有代码的映射

| 设计系统项 | 现有文件 | 现状 | 需要的动作 | 优先级 |
| --- | --- | --- | --- | --- |
| 颜色 / 字体 / 圆角 Token | `src/index.css`（`@theme` + `:root` + `.dark`） | shadcn 默认 indigo + 冷灰 + 无衬线标题 | **替换**（§3.4 片段） | P0 |
| `--font-heading` | `src/index.css` | `= var(--font-sans)` | 改为衬线栈（+ 引入可变衬线字体或纯回退） | P0 |
| Button | `src/components/ui/button.tsx` | 6 变体 / 7 尺寸，最大 36px | 增 `touch`(44) 尺寸；`secondary` 对齐 `soft` 配色 | P0 |
| Card | `src/components/ui/card.tsx` | `rounded-xl` + `ring-foreground/10` | 改 `rounded-lg(12)` + `--border` | P1 |
| Badge | **无**（`MistakesPage` / `ExamListPage` 各写一份） | 重复实现 | 新建 `ui/badge.tsx`，两处复用 | P1 |
| ProgressBar | **无**（`ExamListPage` 内联） | 内联 | 新建 `ui/progress.tsx` | P1 |
| Input / Select | `src/components/ui/input.tsx` | 仅 Input | 补 Select（原生 + 同款样式） | P2 |
| Table | **无** | — | 如需桌面表格，新建 `ui/table.tsx` | P2 |
| Sheet / Drawer | `ui/sheet.tsx` + `practice/AnswerSheet.tsx` | 新建 | 已落地：Base UI `Dialog` 封装底部抽屉 + 移动端答题卡 ✅ | P2 |
| App Shell（TopBar + BottomTabBar） | **无**（`src/router/index.tsx` 直接铺页面） | 每页各自返回链接 | 🔲 新建 `components/layout/app-shell.tsx` | P2 |
| 页面容器（768 单栏） | 所有 `src/pages/*.tsx` | `max-w-3xl px-5` | 检索页加宽到 1280；阅读区保持 768 | P2 |
| 题目渲染 | `components/exams/{ExamSection,ChoiceQuestion,PassageText,TextQuestion}.tsx` | 已有 | 换 token；选项态按 §8.8 | P1 |
| 练习页 | `components/practice/{PracticeQuestion,PracticeResult}.tsx` | 已有 | 换 token；底部 sticky 操作条（P2） | P1 |
| 错题卡 | `components/mistakes/MistakeCard.tsx` | 手写徽章与状态样式 | 改用 `Badge` 组件 | P1 |
| 状态视图 | 各页 `StateCard` / `FullScreen` | 已有且符合规范 | 仅换 token | P1 |
| 计时器 / 题号格子 / Submit | **无对应能力** | — | 属功能缺口，**不作为样式工作** | 待决策 |

**图例**：P0 = 换皮阶段；P1 = 补件阶段；P2 = 重构阶段。

---

## 12. 迁移顺序与验收（**草案，未执行**）

| 步骤 | 内容 | 验收点 |
| --- | --- | --- |
| **S1** | 只改 `src/index.css` 的 `@theme` / `:root` | `tsc -b` + `lint` 通过；5 个页面视觉整体切换；**结构零改动**，可一键回退 |
| **S2** | 新增 `badge` `progress`；Button 增 `touch`；Card 换描边；两处内联徽章改用 `Badge` | 徽章在 3 处（列表/详情/错题）表现一致；移动端按钮 ≥44 |
| **S3** | AppShell + 列表页加宽/表格化 + 详情页 2:1 + 练习页 sticky 条 | 375px 无横向溢出；键盘可达；对比度复测 |

**每一步的回归检查**：`tsc -b` → `pnpm lint` → `pnpm build` → 375px 溢出检查 → console/pageerror = 0。

---

## 13. 本版未覆盖（后续补）

- **深色模式**：设计稿只有浅色，`.dark` 变量与暖白体系冲突 —— 本轮冻结，后续单独出深色 token（不要自动反色）。
- **登录页**：设计稿无对应页面（`LoginPage.tsx` 独立）。
- **Toast / 通知 / 骨架屏细节**：只给了规格方向（§8.16），无像素稿。
- **图表**：统计若升级为图表，`--chart-1..5` 需按新色板重定义。
- **打印 / PDF**：无设计稿。
- **动效时长表**：只给了原则（design-direction §9），未逐组件细化。
- **图标库**：设计稿只用 4 个导航图标 + 搜索/时钟/旗帜/箭头；建议 `lucide-react` 线性图标，1.5 描边。

---

## 14. 变更记录

| 日期 | 内容 |
| --- | --- |
| 2026-09-17 | 首版草案：从 `svgs/`（桌面 + 移动）10 份稿提取，含实测对比度与代码映射。**未修改任何代码。** |
