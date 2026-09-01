-- Компании и контакты могут храниться в справочнике, не попадая в CRM-воронку.
begin;

alter table company drop constraint if exists company_funnel_stage_check;
alter table company add constraint company_funnel_stage_check
  check (funnel_stage in ('database','new_signal','rejected','in_work','touched','met','agreement','revenue','excluded'));

commit;
