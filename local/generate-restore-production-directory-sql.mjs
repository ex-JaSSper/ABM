// Generates a private SQL file that restores companies and contacts from a
// production JSON backup in the neutral `database` state. The output contains
// personal contact data and is intentionally gitignored.

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const source = process.argv[2] || path.join(here, 'backups', 'supabase-before-stage-migration-2026-09-01T06-21-01-091Z.json');
const output = path.join(root, 'supabase', 'restore-production-directory.sql');
const snapshot = JSON.parse(await fs.readFile(source, 'utf8'));
const companies = snapshot.data?.company || [];
const contacts = snapshot.data?.contact || [];

if (!companies.length || !contacts.length) {
  throw new Error(`Backup must contain companies and contacts: ${source}`);
}

const companyRows = companies.map(row => ({
  ...row,
  funnel_stage: 'database',
  is_excluded: false,
  excluded_reason: '',
  rejection_reason_id: null,
  rejection_comment: '',
  rejected_at: null,
  purge_at: null,
  revenue_amount: 0,
  last_activity_at: row.created_at,
}));
const contactRows = contacts.map(row => ({
  ...row,
  status: 'active',
  excluded_reason: '',
  crm_stage: 'database',
  hypothesis_id: null,
  hyp_task_id: null,
  max_stage: null,
  response_status: 'none',
}));

function value(input) {
  if (input === null || input === undefined) return 'null';
  if (typeof input === 'boolean') return input ? 'true' : 'false';
  if (typeof input === 'number') return String(input);
  return `'${String(input).replaceAll("'", "''")}'`;
}

function insert(table, rows) {
  const columns = Object.keys(rows[0]);
  const tuples = rows.map(row => `  (${columns.map(column => value(row[column])).join(', ')})`);
  return `insert into ${table} (${columns.map(column => `"${column}"`).join(', ')}) values\n${tuples.join(',\n')};`;
}

const sql = `-- Restore ABM production directory without creating CRM signals.
-- Source: ${path.basename(source)}
-- Companies: ${companyRows.length}; contacts: ${contactRows.length}

begin;

alter table company drop constraint if exists company_funnel_stage_check;
alter table company add constraint company_funnel_stage_check
  check (funnel_stage in ('database','new_signal','rejected','in_work','touched','met','agreement','revenue','excluded'));

delete from company_task;
delete from contact;
delete from company;

${insert('company', companyRows)}

${insert('contact', contactRows)}

do $$
declare company_count bigint; contact_count bigint; signal_count bigint; crm_count bigint;
begin
  select count(*) into company_count from company;
  select count(*) into contact_count from contact;
  select count(*) into signal_count from company where funnel_stage = 'new_signal';
  select count(*) into crm_count from contact where crm_stage <> 'database' or crm_stage is null;
  if company_count <> ${companyRows.length} or contact_count <> ${contactRows.length} or signal_count <> 0 or crm_count <> 0 then
    raise exception 'Restore check failed: companies %, contacts %, signals %, CRM contacts %', company_count, contact_count, signal_count, crm_count;
  end if;
end $$;

commit;

select
  (select count(*) from company) as companies,
  (select count(*) from contact) as contacts,
  (select count(*) from company where funnel_stage = 'new_signal') as signals,
  (select count(*) from company_task) as crm_actions;
`;

await fs.writeFile(output, sql, 'utf8');
console.log(output);
console.log(JSON.stringify({ companies: companyRows.length, contacts: contactRows.length, signals: 0, crm_actions: 0 }));
