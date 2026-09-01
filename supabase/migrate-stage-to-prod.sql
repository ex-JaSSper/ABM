-- Production migration: старая ABM-схема -> текущее зеркало local/schema.sqlite.sql.
-- Идемпотентна и не удаляет рабочие данные. До включения авторизации сохраняет
-- текущий публичный режим доступа; закрытие anon выполняется отдельной миграцией.

begin;

create extension if not exists "pgcrypto";

alter table company add column if not exists inn text default '';

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
alter table company drop constraint if exists company_funnel_stage_check;
alter table company add constraint company_funnel_stage_check
  check (funnel_stage in ('database','new_signal','rejected','in_work','touched','met','agreement','revenue','excluded'));

alter table contact add column if not exists crm_stage text;
alter table contact add column if not exists hypothesis_id uuid references hypothesis(id) on delete set null;
alter table contact add column if not exists hyp_task_id uuid references hyp_task(id) on delete set null;
alter table contact add column if not exists owner_name text default 'Я';
alter table contact add column if not exists max_stage text;
alter table contact add column if not exists response_status text not null default 'none';
alter table contact drop constraint if exists contact_response_status_check;
alter table contact add constraint contact_response_status_check
  check (response_status in ('none','waiting','replied','ignored'));

alter table hyp_task add column if not exists aggregation_mode text not null default 'actions';
alter table hyp_task drop constraint if exists hyp_task_aggregation_mode_check;
alter table hyp_task add constraint hyp_task_aggregation_mode_check
  check (aggregation_mode in ('actions','contacts','companies'));

alter table hypothesis drop constraint if exists hypothesis_status_check;
alter table hypothesis add constraint hypothesis_status_check
  check (status in ('idea','in_work','validated','paused','rejected','archived'));

alter table company_task add column if not exists cycle int not null default 0;
alter table company_task add column if not exists record_kind text not null default 'task';
alter table company_task add column if not exists stage text;
alter table company_task add column if not exists start_at timestamptz;
alter table company_task add column if not exists started_at timestamptz;
alter table company_task add column if not exists actual_at timestamptz;
alter table company_task add column if not exists channel text default '';
alter table company_task add column if not exists owner_name text default 'Я';
alter table company_task drop constraint if exists company_task_record_kind_check;
alter table company_task add constraint company_task_record_kind_check
  check (record_kind in ('task','activity'));
alter table company_task drop constraint if exists company_task_stage_check;
alter table company_task add constraint company_task_stage_check
  check (stage is null or stage in ('signal','touch','meeting','deal','won','deferred'));

create table if not exists board_task (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid references strategy(id) on delete cascade,
  hypothesis_id uuid references hypothesis(id) on delete set null,
  hyp_task_id uuid references hyp_task(id) on delete set null,
  title text not null default 'Новая задача',
  status text not null default 'new' check (status in ('new','in_work','deferred','done')),
  priority text not null default 'B' check (priority in ('A','B','C')),
  start_at timestamptz,
  due_at timestamptz,
  started_at timestamptz,
  owner_name text default 'Я',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table board_task add column if not exists priority text not null default 'B';
alter table board_task add column if not exists start_at timestamptz;
alter table board_task add column if not exists started_at timestamptz;
alter table board_task add column if not exists owner_name text default 'Я';
alter table board_task drop constraint if exists board_task_priority_check;
alter table board_task add constraint board_task_priority_check check (priority in ('A','B','C'));

create index if not exists idx_board_strategy on board_task(strategy_id);
create index if not exists idx_contact_company on contact(company_id);
create index if not exists idx_task_company on company_task(company_id);
create index if not exists idx_task_contact on company_task(contact_id);
create index if not exists idx_task_hyptask on company_task(hyp_task_id);
create index if not exists idx_task_status on company_task(status);

alter table rejection_reason enable row level security;
alter table board_task enable row level security;
drop policy if exists "public all" on rejection_reason;
create policy "public all" on rejection_reason for all to anon, authenticated using (true) with check (true);
drop policy if exists "public all" on board_task;
create policy "public all" on board_task for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on rejection_reason, board_task to anon, authenticated;

commit;
