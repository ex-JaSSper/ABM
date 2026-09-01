// Generates one transactional Supabase SQL script containing both the
// schema migration and an exact snapshot of local/abm.db.

import fs from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const dbPath = path.join(here, 'abm.db');
const migrationPath = path.join(root, 'supabase', 'migrate-stage-to-prod.sql');
const outputPath = path.join(root, 'supabase', 'stage-to-prod.sql');

const deleteOrder = [
  'board_task', 'company_task', 'kpi_target', 'hyp_subtask', 'contact',
  'hyp_task', 'hypothesis', 'company', 'rejection_reason', 'strategy',
];
const insertOrder = [
  'strategy', 'rejection_reason', 'company', 'hypothesis', 'hyp_task',
  'hyp_subtask', 'kpi_target', 'contact', 'company_task', 'board_task',
];
const booleanColumns = {
  hyp_subtask: new Set(['is_done']),
  rejection_reason: new Set(['active']),
  company: new Set(['is_excluded']),
  company_task: new Set(['is_next_step']),
};

function sqlValue(value, boolean = false) {
  if (value === null || value === undefined) return 'null';
  if (boolean) return Number(value) ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Non-finite numeric value: ${value}`);
    return String(value);
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}

const db = new DatabaseSync(dbPath, { readOnly: true });
const sections = [];
const counts = {};

try {
  for (const table of insertOrder) {
    const columns = db.prepare(`pragma table_info(${table})`).all().map(row => row.name);
    const rows = db.prepare(`select * from ${table}`).all();
    counts[table] = rows.length;
    if (!rows.length) {
      sections.push(`-- ${table}: 0 rows`);
      continue;
    }
    const tuples = rows.map(row => `  (${columns.map(column =>
      sqlValue(row[column], booleanColumns[table]?.has(column))
    ).join(', ')})`);
    sections.push([
      `-- ${table}: ${rows.length} rows`,
      `insert into ${table} (${columns.map(column => `"${column}"`).join(', ')}) values`,
      `${tuples.join(',\n')};`,
    ].join('\n'));
  }
} finally {
  db.close();
}

let migration = await fs.readFile(migrationPath, 'utf8');
migration = migration.replace(/^\uFEFF/, '').replace(/\s*commit;\s*$/i, '').trim();

const expectedChecks = insertOrder.map(table =>
  `    ('${table}', ${counts[table]})`
).join(',\n');

const sql = `-- =====================================================================
-- ABM: stage SQLite -> production Supabase
-- Generated: ${new Date().toISOString()}
-- This script updates the schema and atomically replaces production data.
-- On any SQL error the entire transaction is rolled back.
-- Local source counts: ${JSON.stringify(counts)}
-- =====================================================================

${migration}

-- Replace production rows in foreign-key-safe order.
${deleteOrder.map(table => `delete from ${table};`).join('\n')}

-- Exact snapshot from local/abm.db.
${sections.join('\n\n')}

-- Fail the transaction if a table count differs from the local snapshot.
do $$
declare
  item record;
  actual_count bigint;
begin
  for item in
    select * from (values
${expectedChecks}
    ) as expected(table_name, expected_count)
  loop
    execute format('select count(*) from %I', item.table_name) into actual_count;
    if actual_count <> item.expected_count then
      raise exception 'Count check failed for %: expected %, got %',
        item.table_name, item.expected_count, actual_count;
    end if;
  end loop;
end $$;

commit;

-- The SQL Editor result should show these exact counts.
select 'strategy' as table_name, count(*) as row_count from strategy
union all select 'kpi_target', count(*) from kpi_target
union all select 'hypothesis', count(*) from hypothesis
union all select 'hyp_task', count(*) from hyp_task
union all select 'hyp_subtask', count(*) from hyp_subtask
union all select 'rejection_reason', count(*) from rejection_reason
union all select 'company', count(*) from company
union all select 'contact', count(*) from contact
union all select 'company_task', count(*) from company_task
union all select 'board_task', count(*) from board_task;
`;

await fs.writeFile(outputPath, sql, 'utf8');
console.log(outputPath);
console.log(JSON.stringify(counts));
