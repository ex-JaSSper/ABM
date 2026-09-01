-- Добавляет приоритет задач канбана без удаления существующих данных.
-- Выполнить в Supabase SQL Editor перед публикацией обновлённого канбана.

alter table board_task
  add column if not exists priority text not null default 'B';

alter table board_task
  drop constraint if exists board_task_priority_check;

alter table board_task
  add constraint board_task_priority_check
  check (priority in ('A','B','C'));
