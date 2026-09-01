-- Добавляет состояние ответа ЛПР без удаления существующих данных.
-- Выполнить в Supabase SQL Editor перед публикацией обновлённой CRM.

alter table contact
  add column if not exists response_status text not null default 'none';

alter table contact
  drop constraint if exists contact_response_status_check;

alter table contact
  add constraint contact_response_status_check
  check (response_status in ('none','waiting','replied','ignored'));
