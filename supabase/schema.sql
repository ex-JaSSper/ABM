-- =====================================================================
--  ABM-сервис · схема БД для Supabase (Postgres)
--  Запустить целиком в Supabase → SQL Editor → New query → Run.
--  Модель 1:1 с прототипом: стратегии → гипотезы → задачи → подзадачи,
--  компании → контакты (ЛПР) → задачи по компании.
--  Рабочее пространство общее (1–5 пользователей видят одни данные).
-- =====================================================================

create extension if not exists "pgcrypto"; -- для gen_random_uuid()

-- ---------- СТРАТЕГИЯ ----------
create table if not exists strategy (
  id              uuid primary key default gen_random_uuid(),
  name            text not null default 'Новая стратегия',
  quarter         text default '',
  description     text default '',
  expected_effect text default '',
  sort_order      int  default 0,
  created_at      timestamptz not null default now()
);

create table if not exists kpi_target (
  id           uuid primary key default gen_random_uuid(),
  strategy_id  uuid not null references strategy(id) on delete cascade,
  kpi_key      text not null check (kpi_key in ('new_touches','new_meetings','repeat_meetings','agreements','revenue')),
  unit         text not null default 'шт.',
  plan_value   numeric not null default 0,
  prev_q_value numeric not null default 0
);
create index if not exists idx_kpi_strategy on kpi_target(strategy_id);

-- ---------- ГИПОТЕЗЫ ----------
create table if not exists hypothesis (
  id          uuid primary key default gen_random_uuid(),
  strategy_id uuid not null references strategy(id) on delete cascade,
  code        text default '',
  title       text not null default 'Гипотеза',
  smart       text default '',
  status      text not null default 'idea' check (status in ('idea','in_work','validated','paused','rejected')),
  priority    text not null default 'B' check (priority in ('A','B','C')),
  unit        text default 'Цель',
  plan        int  not null default 1,
  sort_order  int  default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_hyp_strategy on hypothesis(strategy_id);

create table if not exists hyp_task (
  id            uuid primary key default gen_random_uuid(),
  hypothesis_id uuid not null references hypothesis(id) on delete cascade,
  title         text not null default 'Задача',
  unit          text default 'КЕ',
  plan          int  not null default 1,
  priority      text not null default 'B' check (priority in ('A','B','C')),
  mode          text not null default 'manual' check (mode in ('manual','tracked')),
  track         text check (track in ('touch','meeting','agreement')),   -- для mode='tracked'
  sort_order    int  default 0
);
create index if not exists idx_htask_hyp on hyp_task(hypothesis_id);

create table if not exists hyp_subtask (
  id          uuid primary key default gen_random_uuid(),
  hyp_task_id uuid not null references hyp_task(id) on delete cascade,
  title       text not null default 'Подзадача',
  is_done     boolean not null default false,
  sort_order  int  default 0
);
create index if not exists idx_subtask_task on hyp_subtask(hyp_task_id);

-- ---------- КОМПАНИИ / КОНТАКТЫ ----------
create table if not exists company (
  id                       uuid primary key default gen_random_uuid(),
  ext_no                   text,                        -- № из загружаемой таблицы
  name                     text not null default 'Без названия',
  inn                      text default '',
  priority                 text default 'B' check (priority in ('A','B','C')),
  segment                  text default '',
  category                 text default '',
  geography                text default '',
  why_fit                  text default '',
  signal_note              text default '',
  relevant_hypothesis_text text default '',
  what_to_check            text default '',
  who_to_find              text default '',
  extended_reason          text default '',
  first_message_template   text default '',
  second_message_template  text default '',
  funnel_stage             text not null default 'new_signal'
                             check (funnel_stage in ('new_signal','rejected','in_work','touched','met','agreement','revenue','excluded')),
  is_excluded              boolean not null default false,
  excluded_reason          text default '',
  revenue_amount           numeric not null default 0,
  created_at               timestamptz not null default now(),
  last_activity_at         timestamptz not null default now()
);
-- идемпотентный импорт по № (для ON CONFLICT нужен обычный уникальный индекс;
-- у компаний без номера ext_no = NULL — NULL'ы не конфликтуют между собой).
create unique index if not exists uq_company_ext_no on company(ext_no);

create table if not exists contact (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid references company(id) on delete set null,   -- null = unmatched
  ext_company_no     text default '',
  company_name       text default '',
  priority           text default '',
  segment            text default '',
  role_target        text default '',
  contact_no         text default '',
  full_name          text not null default '',
  position           text default '',
  phone              text default '',
  email              text default '',
  telegram           text default '',
  tenchat            text default '',
  network            text default '',
  linkedin           text default '',
  other_social       text default '',
  source             text default '',
  last_digital_trace text default '',
  last_trace_date    text default '',
  check_date         text default '',
  confidence         text default '',
  comment            text default '',
  how_to_get         text default '',
  status             text not null default 'active' check (status in ('active','excluded')),
  excluded_reason    text default '',
  crm_stage           text,
  created_at         timestamptz not null default now()
);
create index if not exists idx_contact_company on contact(company_id);

-- ---------- ЗАДАЧИ ПО КОМПАНИИ (двигают воронку/метрики) ----------
create table if not exists company_task (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references company(id) on delete cascade,
  contact_id    uuid references contact(id) on delete set null,       -- с каким ЛПР
  hypothesis_id uuid references hypothesis(id) on delete set null,    -- в рамках какой гипотезы
  hyp_task_id   uuid references hyp_task(id) on delete set null,      -- к какой задаче гипотезы (автотрекинг)
  title         text not null default '',
  description   text default '',
  type          text not null check (type in ('analyze_signal','touch_new','touch_repeat','meeting_new','meeting_repeat','agreement','custom')),
  status        text not null default 'planned' check (status in ('planned','waiting','done','cancelled')),
  result_note   text default '',
  is_next_step  boolean not null default false,
  due_at        timestamptz,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz,
  cycle         int not null default 0
);
create index if not exists idx_task_company on company_task(company_id);
create index if not exists idx_task_contact on company_task(contact_id);
create index if not exists idx_task_hyptask on company_task(hyp_task_id);
create index if not exists idx_task_status  on company_task(status);

-- ---------- ДОСКА ЗАДАЧ (канбан по гипотезам) ----------
create table if not exists board_task (
  id uuid primary key default gen_random_uuid(),
  strategy_id uuid references strategy(id) on delete cascade,
  hypothesis_id uuid references hypothesis(id) on delete set null,
  hyp_task_id uuid references hyp_task(id) on delete set null,
  title text not null default 'Новая задача',
  status text not null default 'new' check (status in ('new','in_work','deferred','done')),
  due_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_board_strategy on board_task(strategy_id);

-- =====================================================================
--  RLS · общее рабочее пространство для авторизованных пользователей
--  (мультиарендность не нужна — все видят одни данные)
-- =====================================================================
alter table strategy     enable row level security;
alter table kpi_target   enable row level security;
alter table hypothesis   enable row level security;
alter table hyp_task     enable row level security;
alter table hyp_subtask  enable row level security;
alter table company      enable row level security;
alter table contact      enable row level security;
alter table company_task enable row level security;
alter table board_task enable row level security;

-- Полный доступ для залогиненных пользователей.
do $$
declare t text;
begin
  foreach t in array array['strategy','kpi_target','hypothesis','hyp_task','hyp_subtask','company','contact','company_task','board_task']
  loop
    execute format('drop policy if exists "authenticated all" on %I;', t);
    execute format('create policy "authenticated all" on %I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
--  ВАРИАНТ БЕЗ ЛОГИНА (только для быстрой пробы, НЕ для продакшена):
--  раскомментируйте, чтобы разрешить доступ по anon-ключу без входа.
--  Внимание: тогда любой, у кого есть URL+anon-ключ, читает/пишет данные.
-- ---------------------------------------------------------------------
-- do $$
-- declare t text;
-- begin
--   foreach t in array array['strategy','kpi_target','hypothesis','hyp_task','hyp_subtask','company','contact','company_task']
--   loop
--     execute format('create policy "anon all" on %I for all to anon using (true) with check (true);', t);
--   end loop;
-- end $$;

-- ---------------------------------------------------------------------
--  Стартовая пустая стратегия + её KPI-строки (чтобы приложение
--  открылось не пустым). Выполнится один раз.
-- ---------------------------------------------------------------------
insert into strategy (id, name, quarter)
select gen_random_uuid(), 'Новая стратегия', ''
where not exists (select 1 from strategy);

insert into kpi_target (strategy_id, kpi_key, unit)
select s.id, k.key, k.unit
from strategy s
cross join (values
  ('new_touches','шт.'),('new_meetings','шт.'),('repeat_meetings','шт.'),
  ('agreements','шт.'),('revenue','руб.')
) as k(key,unit)
where not exists (select 1 from kpi_target)
limit 5;
