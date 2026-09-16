-- ============================================================================
-- Baseline grants（Phase 5A.5）—— 记录「本阶段开始前」线上真实权限，供干净库复现。
-- 说明：只固化「与安全相关的 DML/SELECT 归属」；Supabase 对 anon/service_role/object-owner
--       以及对象级 REFERENCES/TRIGGER/TRUNCATE 等默认授予属环境自带，未逐条复刻（见报告）。
-- 现状要点：
--   * 题库 4 表：authenticated = SELECT only（4E 收口）；service_role 拥有写权限。
--   * practice_sessions / practice_answers：authenticated 拥有 DML（5A 授权）+ own-row RLS。
--   * mistakes / mistake_reviews：authenticated **无 DML**（有 RLS 策略但缺 GRANT）——本阶段 000003 修复。
-- ============================================================================

-- 题库：authenticated 仅读，不写
revoke all on public.exam_papers, public.exam_sections, public.section_items, public.item_options from authenticated;
grant  select on public.exam_papers, public.exam_sections, public.section_items, public.item_options to authenticated;
grant  select, insert, update, delete on public.exam_papers, public.exam_sections, public.section_items, public.item_options to service_role;

-- 练习：authenticated 可写自己的行（RLS 兜底）
revoke all on public.practice_sessions, public.practice_answers from authenticated;
grant  select, insert, update, delete on public.practice_sessions, public.practice_answers to authenticated;

-- 错题：基线=现状（authenticated 无 DML；修复见 000003，不在基线里预先授予）
revoke all on public.mistakes, public.mistake_reviews from authenticated;
