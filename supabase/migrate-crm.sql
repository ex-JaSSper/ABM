-- =====================================================================
--  Миграция под CRM-канбан: ИНН у компании, crm_stage у контакта,
--  cycle у задачи, таблица board_task. Запустить в Supabase SQL Editor.
--  Безопасно повторно (IF NOT EXISTS).
-- =====================================================================

alter table company     add column if not exists inn text default '';
alter table contact     add column if not exists crm_stage text;   -- null | signal | deferred | touch1 | meeting1 | touch2 | meeting2 | deal | won
alter table company_task add column if not exists cycle int not null default 0;

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

alter table board_task enable row level security;
drop policy if exists "public all" on board_task;
create policy "public all" on board_task for all to anon, authenticated using (true) with check (true);
