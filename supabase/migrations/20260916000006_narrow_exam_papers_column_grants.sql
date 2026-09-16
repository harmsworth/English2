-- ============================================================================
-- Phase 5E · exam_papers 收紧为最小列级 SELECT（P1 一致性：去掉内部元数据暴露）
-- 现状：0002 之前给 exam_papers 的是**表级 SELECT**（含 metadata/content_hash/
--   source_file/source_id/created_at/updated_at/version 等前端不用的内部列）。
-- 本迁移：revoke 表级 → 只授前端运行时真正需要的 4 列（含 filter/order 依赖列）。
--   实测前端 exam_papers 仅用到：id(select+.eq) / year(select+.order) / title(select) /
--   is_current(.eq filter)。version 无运行时依赖 → 不给。
-- ⚠️ is_current / year 虽不被返回，但作为 filter/order 列必须有 SELECT，否则 42501。
-- 不回改 0002（已执行的历史基线）；用后置新迁移覆盖，重放顺序收敛终态。
-- ============================================================================

revoke select on public.exam_papers from authenticated;

grant select (
  id,
  year,
  title,
  is_current
)
on public.exam_papers
to authenticated;
