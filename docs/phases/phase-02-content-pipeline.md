# Phase 2：真题内容体系与数据边界

**状态：** `done`
**上位文档：** [Phases README](./README.md)、`docs/architecture.md`、`docs/data/README.md`

---

## 1. Phase 目标

把 2010–2026 共 17 套英语（二）真题稳定地放进数据库，并且**让答案类数据不进入浏览器网络层**。

这是整个产品的地基：没有它，后面所有"练习 / 判分 / 错题"都无从谈起。

---

## 2. 用户价值

用户能通过一个稳定、结构化的题库，浏览到完整、正确、顺序正确的真题内容；
同时题目答案不会因为前端查询而被整包拉走。

---

## 3. 包含范围

- `data/exams/papers-YYYY.json`（2010–2026）作为离线 Source of Truth
- `sync_exam_paper` RPC：按 `content_hash` 幂等写入四层结构
- ~~`supabase/migrations/` 基线~~ → 已由用户删除；数据库变更改为直接在线上执行（见 `docs/architecture.md` §35）
- Service 层公开 DTO：只下发 UI 需要的字段
- 答案边界收口（应用层层层收紧 + 数据库列级权限）

---

## 4. 不包含范围

- 前端直接读取 `data/exams/*.json`
- 判分逻辑（见 Phase 6）
- 错题 / 历史 / 统计
- 重建第二套题库或 Paper Index

---

## 5. 功能目标

| Goal | 内容 | 状态 |
| --- | --- | --- |
| 2.1 | 17 套真题经 `sync_exam_paper` 入库，重复同步幂等 | 完成 |
| 2.2 | `src/services/exams.ts` 提供 `getCurrentExamPapers()` / `getExamPaperById()`，返回公开 DTO | 完成 |
| 2.3 | 查询一律显式列白名单，禁止 `*` | 完成 |
| 2.4 | `section_items.correct_option` / `explanation` / `extra_data`、`exam_sections.source_data` 不下发 | 完成 |
| 2.5 | 翻译题参考译文（`passage_zh`）不下发 | 完成 |
| 2.6 | `exam_papers` 读取列收窄为 `id / year / title` | 完成 |
| 2.7 | 答案边界已在线上库收口（列级 GRANT/REVOKE），并读取 `information_schema.column_privileges` 核验 | 完成 |
| 2.8 | 四层关系完整：17 papers / 153 sections / 816 items / 3290 options | 完成 |

---

## 6. 涉及页面

- [真题列表](../pages/exams.md)
- [真题详情](../pages/exam-detail.md)

---

## 7. 涉及数据

**核心题库表（前端只读）：**

```text
exam_papers     id, year, title, is_current, source_id, version, content_hash, metadata, source_file
exam_sections   id, paper_id, source_id, type, title, score, minutes, intro, passage, prompt, tips, extra_data, sort_order
section_items   id, section_id, source_id, item_no, item_type, content
item_options    id, item_id, option_index, content
```

**前端运行时不读取的列：**

```text
exam_sections.passage_zh        （翻译题的 passage_zh = 参考译文）
exam_sections.source_data       （原始题面 JSON，153 个大题里 102 个带 ans / explain）
section_items.correct_option    （0-based 正确答案下标）
section_items.explanation
section_items.extra_data        （翻译题含 reference_translation）
exam_papers.content_hash / source_file / metadata / version / source_id
```

**离线数据：**

```text
data/exams/papers-2010.json … papers-2026.json   顶层是 array，元素是「大题/section」
data/exams/index.json      离线 Section-level 索引（153 条），不是 Paper List
data/exams/manifest.json   指纹 / 审计产物
```

详见 [`docs/data/README.md`](../data/README.md)。

---

## 8. 涉及代码区域

```text
src/services/exams.ts       公开 DTO、列白名单、排序契约、错误归一化
src/services/supabase.ts
src/types/database.ts
data/exams/*.json
```

---

## 9. 技术约束

- **Supabase 是运行时唯一事实来源**；`data/exams/` 只用于同步 / 校验 / 审计（见 `docs/architecture.md` §9–§13）
- **禁止把 `data/exams/index.json` 当作 Paper List 数据源**（见 `docs/AGENTS.md` §14）
- 数据库结构变化必须有 migration，不能只改 `src/types/database.ts`（见 `docs/architecture.md` §35）
- 破坏性数据库操作必须先经用户确认（见 `docs/AGENTS.md` §17）
- 不要为了字段级完美隔离创建 View / RPC，除非真实需求出现（见 `docs/architecture.md` §32）

---

## 10. 验收标准

- `getCurrentExamPapers()` 返回 17 条，按 `year` 倒序
- `getExamPaperById(id)` 返回 9 个 section，items / options 顺序正确
- 浏览器 Network 中 paper detail 响应**不包含** `correct_option` / `explanation` / `source_data` / `passage_zh`
- 用 authenticated 身份直接 REST 读上述列被拒（42501）
- 翻译题的参考译文在响应体与 DOM 中都不出现
- `pnpm build` / `pnpm lint` 通过

---

## 11. 完成定义

见 [Phases README §7](./README.md#7-完成定义)。

---

## 12. 后续 Phase

[Phase 3：用户身份与访问入口](./phase-03-auth.md)
