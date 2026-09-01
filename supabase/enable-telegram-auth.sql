-- Закрывает Data API для анонимных посетителей и допускает только вручную
-- подтверждённых пользователей Supabase Auth. Запускать ПОСЛЕ настройки
-- custom OIDC provider `custom:telegram` и проверки первого входа.

begin;

create table if not exists app_member (
  user_id uuid primary key references auth.users(id) on delete cascade,
  telegram_id text unique,
  display_name text default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table app_member enable row level security;

create or replace function public.is_app_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.app_member
    where user_id = (select auth.uid()) and active = true
  );
$$;

revoke all on function public.is_app_member() from public;
grant execute on function public.is_app_member() to authenticated;

drop policy if exists "member reads self" on app_member;
create policy "member reads self" on app_member
  for select to authenticated
  using (user_id = (select auth.uid()));

do $$
declare t text;
begin
  foreach t in array array[
    'strategy','kpi_target','hypothesis','hyp_task','hyp_subtask',
    'rejection_reason','company','contact','company_task','board_task'
  ] loop
    execute format('alter table %I enable row level security',t);
    execute format('drop policy if exists "public all" on %I',t);
    execute format('drop policy if exists "anon all" on %I',t);
    execute format('drop policy if exists "authenticated all" on %I',t);
    execute format('drop policy if exists "member select" on %I',t);
    execute format('drop policy if exists "member insert" on %I',t);
    execute format('drop policy if exists "member update" on %I',t);
    execute format('drop policy if exists "member delete" on %I',t);
    execute format('revoke all on table %I from anon',t);
    execute format('grant select,insert,update,delete on table %I to authenticated',t);
    execute format('create policy "member select" on %I for select to authenticated using ((select public.is_app_member()))',t);
    execute format('create policy "member insert" on %I for insert to authenticated with check ((select public.is_app_member()))',t);
    execute format('create policy "member update" on %I for update to authenticated using ((select public.is_app_member())) with check ((select public.is_app_member()))',t);
    execute format('create policy "member delete" on %I for delete to authenticated using ((select public.is_app_member()))',t);
  end loop;
end $$;

commit;

-- После первого Telegram-входа добавить пользователя из Authentication > Users:
-- insert into app_member (user_id, telegram_id, display_name)
-- values ('SUPABASE_AUTH_USER_UUID', 'TELEGRAM_NUMERIC_ID', 'Имя');
