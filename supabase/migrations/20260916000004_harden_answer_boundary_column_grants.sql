-- ============================================================================
-- Phase 5A.5 · 答案边界最小落地（P1-1）：把答案/参考列从 authenticated 的可读列中收回。
-- 现状（000001/000002 基线）：题库表 authenticated 有 **表级 SELECT**，RLS 仅 `qual=true` 且
--   **不限制列** → 绕过前端可 REST 直读 correct_option / explanation / section_items.extra_data
--   (含 reference_translation) / exam_sections.source_data。审查已实测确认可读（HTTP 200）。
-- 本迁移：改为**列级 SELECT**，只放开题面渲染所需的安全列，把答案列移出 authenticated 权限。
--   * 前端 Service 从不 SELECT 这些答案列（见 exams.ts 显式白名单），因此对现有查询无影响。
--   * 关系内嵌所需的 join 键（section_items.section_id、exam_sections.paper_id）与 app 用到的列均已授予。
--   * 判分所需的 correct_option/explanation/source_data **仍保留在库里**，供 Phase 5C 服务端 RPC(SECURITY DEFINER) 读取；不影响 service_role。
-- 残留（有意保留，交 5C）：exam_sections.passage_zh 仍列级可读（非翻译题需要它作“中文参考”）；
--   翻译题 passage_zh 的行级隐藏靠查询 `zh.type≠翻译` 完成，**列级权限无法按行取舍**，故翻译参考答案
--   在“绕过前端 + 指定行”下仍可能被直读。彻底收口需在 5C 建「按行 null 掉翻译 passage_zh」的安全视图。
-- 回退（如需）：grant select on public.section_items, public.exam_sections to authenticated;  （恢复表级）
-- ============================================================================

revoke select on public.section_items from authenticated;
grant select (id, section_id, source_id, item_no, item_type, content, created_at, updated_at)
  on public.section_items to authenticated;

revoke select on public.exam_sections from authenticated;
grant select (id, paper_id, source_id, type, title, score, minutes, intro, passage, passage_zh, prompt, tips, extra_data, sort_order, created_at, updated_at)
  on public.exam_sections to authenticated;
