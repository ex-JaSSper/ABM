-- Добавляет статус архива гипотез без удаления данных.
-- Выполнить в Supabase SQL Editor перед публикацией интерфейса с архивом.

alter table hypothesis drop constraint if exists hypothesis_status_check;
alter table hypothesis
  add constraint hypothesis_status_check
  check (status in ('idea','in_work','validated','paused','rejected','archived'));
