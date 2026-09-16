-- ============================================================================
-- English2 baseline schema  (Phase 5A.5 migration bootstrap)
-- 目的：把「当前线上 Supabase 真实状态」固化为 Git 可追踪、可在干净库复现的基线。
-- 说明：本文件按 Phase 5A.5 从线上 information_schema/pg_catalog（pg_get_functiondef、
--       pg_get_constraintdef、pg_get_indexdef 等）逐项核对生成；描述的是**执行前的既有状态**，
--       不含本阶段新增的权限修复（见 000003 / 000004）。对已运行的线上库应视为 no-op 记录，
--       只在**全新库**上重放以复现现状。
-- ============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $function$
begin
    new.updated_at = now();
    return new;
end;
$function$;

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
      RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

-- sync_exam_paper：完整定义由线上 pg_get_functiondef 逐项核对写入，见 000005（保持函数体原样，避免转写误差）。

-- ---------------------------------------------------------------------------
-- Tables（列/类型/可空/默认 均来自线上 information_schema.columns）
-- ---------------------------------------------------------------------------

create table if not exists public.exam_papers (
  id           uuid primary key default gen_random_uuid(),
  source_id    text not null,
  year         integer not null,
  title        text not null,
  version      integer not null default 1,
  is_current   boolean not null default true,
  source_file  text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  content_hash text,
  constraint exam_papers_year_check   check (year >= 1900 and year <= 2100),
  constraint exam_papers_version_check check (version >= 1),
  constraint exam_papers_source_version_unique unique (source_id, version)
);

create table if not exists public.exam_sections (
  id          uuid primary key default gen_random_uuid(),
  paper_id    uuid not null,
  source_id   text not null,
  type        text not null,
  title       text not null,
  score       numeric,
  minutes     integer,
  intro       text,
  passage     text,
  passage_zh  text,
  prompt      text,
  tips        text,
  extra_data  jsonb not null default '{}'::jsonb,
  source_data jsonb not null default '{}'::jsonb,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint exam_sections_paper_id_fkey foreign key (paper_id) references public.exam_papers(id) on delete cascade,
  constraint exam_sections_source_unique unique (paper_id, source_id),
  constraint exam_sections_sort_order_check check (sort_order >= 0),
  constraint exam_sections_score_check  check (score is null or score >= 0),
  constraint exam_sections_minutes_check check (minutes is null or minutes >= 0)
);

create table if not exists public.section_items (
  id             uuid primary key default gen_random_uuid(),
  section_id     uuid not null,
  source_id      text not null,
  item_no        integer not null,
  item_type      text not null,
  content        text,
  explanation    text,
  correct_option integer,
  extra_data     jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint section_items_section_id_fkey foreign key (section_id) references public.exam_sections(id) on delete cascade,
  constraint section_items_number_unique unique (section_id, item_no),
  constraint section_items_source_unique unique (section_id, source_id),
  constraint section_items_correct_option_check check (correct_option is null or correct_option >= 0),
  constraint section_items_number_check check (item_no >= 1)
);

create table if not exists public.item_options (
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null,
  option_index integer not null,
  content      text not null,
  created_at   timestamptz not null default now(),
  constraint item_options_item_id_fkey foreign key (item_id) references public.section_items(id) on delete cascade,
  constraint item_options_unique unique (item_id, option_index),
  constraint item_options_index_check check (option_index >= 0)
);

create table if not exists public.practice_sessions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null,
  session_type      text not null,
  status            text not null default 'active',
  section_id        uuid,
  paper_id          uuid,
  current_item_no   integer not null default 1,
  started_at        timestamptz not null default now(),
  paused_at         timestamptz,
  completed_at      timestamptz,
  time_limit_seconds integer,
  elapsed_seconds   integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint practice_sessions_user_id_fkey   foreign key (user_id) references auth.users(id) on delete cascade,
  constraint practice_sessions_section_id_fkey foreign key (section_id) references public.exam_sections(id) on delete restrict,
  constraint practice_sessions_paper_id_fkey  foreign key (paper_id) references public.exam_papers(id) on delete restrict,
  constraint practice_sessions_type_check   check (session_type = any (array['practice','exam','mistake'])),
  constraint practice_sessions_status_check check (status = any (array['active','paused','completed','abandoned'])),
  constraint practice_sessions_target_check check (
     (session_type = 'practice' and section_id is not null and paper_id is null)
     or (session_type = 'exam' and paper_id is not null)
     or (session_type = 'mistake')
  ),
  constraint practice_sessions_current_item_check check (current_item_no >= 1),
  constraint practice_sessions_elapsed_check    check (elapsed_seconds >= 0),
  constraint practice_sessions_time_limit_check check (time_limit_seconds is null or time_limit_seconds > 0)
);

create table if not exists public.practice_answers (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null,
  item_id            uuid not null,
  selected_option    integer,
  text_answer        text,
  is_correct         boolean,
  score              numeric,
  time_spent_seconds integer not null default 0,
  answered_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint practice_answers_session_id_fkey foreign key (session_id) references public.practice_sessions(id) on delete cascade,
  constraint practice_answers_item_id_fkey     foreign key (item_id) references public.section_items(id) on delete restrict,
  constraint practice_answers_unique unique (session_id, item_id),
  constraint practice_answers_option_check check (selected_option is null or selected_option >= 0),
  constraint practice_answers_time_check   check (time_spent_seconds >= 0),
  constraint practice_answers_score_check  check (score is null or score >= 0)
);

create table if not exists public.mistakes (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null,
  item_id             uuid not null,
  status              text not null default 'active',
  first_wrong_at      timestamptz not null default now(),
  last_wrong_at       timestamptz not null default now(),
  review_count        integer not null default 0,
  consecutive_correct integer not null default 0,
  mastered_at         timestamptz,
  removed_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint mistakes_user_id_fkey foreign key (user_id) references auth.users(id) on delete cascade,
  constraint mistakes_item_id_fkey foreign key (item_id) references public.section_items(id) on delete restrict,
  constraint mistakes_user_item_unique unique (user_id, item_id),
  constraint mistakes_status_check check (status = any (array['active','reviewing','mastered','removed'])),
  constraint mistakes_review_count_check check (review_count >= 0),
  constraint mistakes_consecutive_correct_check check (consecutive_correct >= 0)
);

create table if not exists public.mistake_reviews (
  id              uuid primary key default gen_random_uuid(),
  mistake_id      uuid not null,
  user_id         uuid not null,
  selected_option integer,
  text_answer     text,
  is_correct      boolean,
  score           numeric,
  reviewed_at     timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  constraint mistake_reviews_mistake_id_fkey foreign key (mistake_id) references public.mistakes(id) on delete cascade,
  constraint mistake_reviews_user_id_fkey    foreign key (user_id) references auth.users(id) on delete cascade,
  constraint mistake_reviews_score_check  check (score is null or score >= 0),
  constraint mistake_reviews_option_check check (selected_option is null or selected_option >= 0)
);

-- ---------------------------------------------------------------------------
-- Indexes（线上 pg_indexes 逐项）
-- ---------------------------------------------------------------------------

create index if not exists exam_papers_current_idx on public.exam_papers (is_current);
create index if not exists exam_papers_year_idx on public.exam_papers (year);
create unique index if not exists exam_papers_one_current_version_idx on public.exam_papers (source_id) where (is_current = true);
create index if not exists exam_sections_paper_id_idx on public.exam_sections (paper_id);
create index if not exists exam_sections_sort_order_idx on public.exam_sections (paper_id, sort_order);
create index if not exists exam_sections_type_idx on public.exam_sections (type);
create index if not exists section_items_section_id_idx on public.section_items (section_id);
create index if not exists section_items_number_idx on public.section_items (section_id, item_no);
create index if not exists item_options_item_id_idx on public.item_options (item_id);
create index if not exists practice_sessions_user_id_idx on public.practice_sessions (user_id);
create index if not exists practice_sessions_user_status_idx on public.practice_sessions (user_id, status);
create index if not exists practice_sessions_paper_idx on public.practice_sessions (paper_id);
create index if not exists practice_sessions_section_idx on public.practice_sessions (section_id);
create index if not exists practice_sessions_created_at_idx on public.practice_sessions (created_at desc);
create index if not exists practice_answers_session_idx on public.practice_answers (session_id);
create index if not exists practice_answers_item_idx on public.practice_answers (item_id);
create index if not exists practice_answers_answered_at_idx on public.practice_answers (answered_at desc);
create index if not exists mistakes_item_idx on public.mistakes (item_id);
create index if not exists mistakes_user_status_idx on public.mistakes (user_id, status);
create index if not exists mistakes_user_updated_idx on public.mistakes (user_id, updated_at desc);
create index if not exists mistake_reviews_mistake_idx on public.mistake_reviews (mistake_id);
create index if not exists mistake_reviews_user_idx on public.mistake_reviews (user_id);
create index if not exists mistake_reviews_reviewed_at_idx on public.mistake_reviews (reviewed_at desc);

-- ---------------------------------------------------------------------------
-- Triggers（updated_at；item_options / mistake_reviews 无 updated_at 列 → 无触发器）
-- ---------------------------------------------------------------------------

create trigger exam_papers_updated_at      before update on public.exam_papers      for each row execute function public.set_updated_at();
create trigger exam_sections_updated_at     before update on public.exam_sections    for each row execute function public.set_updated_at();
create trigger section_items_updated_at     before update on public.section_items    for each row execute function public.set_updated_at();
create trigger practice_sessions_updated_at before update on public.practice_sessions for each row execute function public.set_updated_at();
create trigger practice_answers_updated_at  before update on public.practice_answers  for each row execute function public.set_updated_at();
create trigger mistakes_updated_at          before update on public.mistakes          for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS enabled（线上 pg_class.relrowsecurity=true；relforcerowsecurity=false）
-- ---------------------------------------------------------------------------

alter table public.exam_papers     enable row level security;
alter table public.exam_sections   enable row level security;
alter table public.section_items   enable row level security;
alter table public.item_options    enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.practice_answers  enable row level security;
alter table public.mistakes          enable row level security;
alter table public.mistake_reviews   enable row level security;

-- ---------------------------------------------------------------------------
-- RLS Policies（线上 pg_policies 逐项；题库=只读 qual=true；用户数据=own-row auth.uid()）
-- ---------------------------------------------------------------------------

create policy "authenticated users can read exam papers" on public.exam_papers       for select to authenticated using (true);
create policy "authenticated users can read exam sections" on public.exam_sections    for select to authenticated using (true);
create policy "authenticated users can read section items" on public.section_items    for select to authenticated using (true);
create policy "authenticated users can read item options" on public.item_options     for select to authenticated using (true);

create policy "users can create own sessions" on public.practice_sessions for insert  to authenticated with check (auth.uid() = user_id);
create policy "users can read own sessions"   on public.practice_sessions for select  to authenticated using (auth.uid() = user_id);
create policy "users can update own sessions" on public.practice_sessions for update  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can delete own sessions" on public.practice_sessions for delete  to authenticated using (auth.uid() = user_id);

create policy "users can create own answers" on public.practice_answers for insert to authenticated with check (exists (select 1 from public.practice_sessions s where s.id = practice_answers.session_id and s.user_id = auth.uid()));
create policy "users can read own answers"   on public.practice_answers for select to authenticated using (exists (select 1 from public.practice_sessions s where s.id = practice_answers.session_id and s.user_id = auth.uid()));
create policy "users can update own answers" on public.practice_answers for update to authenticated using (exists (select 1 from public.practice_sessions s where s.id = practice_answers.session_id and s.user_id = auth.uid())) with check (exists (select 1 from public.practice_sessions s where s.id = practice_answers.session_id and s.user_id = auth.uid()));

create policy "users can create own mistakes" on public.mistakes for insert to authenticated with check (auth.uid() = user_id);
create policy "users can read own mistakes"   on public.mistakes for select  to authenticated using (auth.uid() = user_id);
create policy "users can update own mistakes" on public.mistakes for update  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "users can delete own mistakes" on public.mistakes for delete  to authenticated using (auth.uid() = user_id);

create policy "users can create own mistake reviews" on public.mistake_reviews for insert to authenticated with check (auth.uid() = user_id);
create policy "users can read own mistake reviews"   on public.mistake_reviews for select  to authenticated using (auth.uid() = user_id);
create policy "users can update own mistake reviews" on public.mistake_reviews for update  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
