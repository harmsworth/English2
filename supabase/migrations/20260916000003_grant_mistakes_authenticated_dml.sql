-- ============================================================================
-- Phase 5A.5 · Goal：补齐 mistakes / mistake_reviews 的 authenticated DML 授权（P1-2）
-- 背景：两表 own-row RLS 策略早已存在（auth.uid()=user_id / mistake 归属），但 authenticated
--       此前只有非 DML 权限 → 未来错题功能一写就被 42501 拒（与 5A 时 practice 同样的坑）。
-- 原则：GRANT 只负责“允许访问表”，行级隔离仍由既有 RLS 的 auth.uid() 保证 —— 本迁移不放宽 RLS。
-- ============================================================================

grant select, insert, update, delete on public.mistakes        to authenticated;
grant select, insert, update, delete on public.mistake_reviews to authenticated;
