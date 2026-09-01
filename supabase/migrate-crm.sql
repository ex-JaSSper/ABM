-- =====================================================================
--  Миграция под CRM-канбан: ИНН у компании, crm_stage у контакта,
--  cycle у задачи, таблица board_task. Запустить в Supabase SQL Editor.
--  Безопасно повторно (IF NOT EXISTS).
-- =====================================================================

alter table company     add column if not exists inn text default '';
alter table contact     add column if not exists crm_stage text;   -- signal | touch | meeting | deal | won | deferred
alter table company_task add column if not exists cycle int not null default 0;
alter table hyp_task add column if not exists aggregation_mode text not null default 'actions';

create table if not exists rejection_reason (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  sort_order int not null default 0,
  rejected_count int not null default 0,
  created_at timestamptz not null default now()
);

alter table company add column if not exists rejection_reason_id uuid references rejection_reason(id) on delete set null;
alter table company add column if not exists rejection_comment text default '';
alter table company add column if not exists rejected_at timestamptz;
alter table company add column if not exists purge_at timestamptz;

alter table contact add column if not exists hypothesis_id uuid references hypothesis(id) on delete set null;
alter table contact add column if not exists hyp_task_id uuid references hyp_task(id) on delete set null;
alter table contact add column if not exists owner_name text default 'Я';
alter table contact add column if not exists max_stage text;

alter table company_task add column if not exists record_kind text not null default 'task';
alter table company_task add column if not exists stage text;
alter table company_task add column if not exists start_at timestamptz;
alter table company_task add column if not exists started_at timestamptz;
alter table company_task add column if not exists actual_at timestamptz;
alter table company_task add column if not exists channel text default '';
alter table company_task add column if not exists owner_name text default 'Я';

create table if not exists board_task (
  id            uuid primary key default gen_random_uuid(),
  strategy_id   uuid references strategy(id) on delete cascade,
  hypothesis_id uuid references hypothesis(id) on delete set null,
  hyp_task_id   uuid references hyp_task(id) on delete set null,
  title         text not null default 'Новая задача',
  status        text not null default 'new' check (status in ('new','in_work','deferred','done')),
  due_at        timestamptz,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);
create index if not exists idx_board_strategy on board_task(strategy_id);

alter table board_task add column if not exists start_at timestamptz;
alter table board_task add column if not exists started_at timestamptz;
alter table board_task add column if not exists owner_name text default 'Я';

alter table board_task enable row level security;
drop policy if exists "public all" on board_task;
create policy "public all" on board_task for all to anon, authenticated using (true) with check (true);

alter table rejection_reason enable row level security;
drop policy if exists "public all" on rejection_reason;
create policy "public all" on rejection_reason for all to anon, authenticated using (true) with check (true);
