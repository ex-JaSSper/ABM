// Сбрасывает локальную SQLite в исходное состояние для end-to-end проверки:
// стратегия/гипотезы/задачи берутся из подготовленного seed, а 10 компаний
// начинают путь с этапа «Выгружено» без истории CRM и задач доски.
import fs from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const dbPath = path.join(here, 'abm.db');
const seedPath = path.join(root, 'supabase', 'seed-digital-efficiency-2026-08.json');
const seed = JSON.parse(await fs.readFile(seedPath, 'utf8'));
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');

const deleteOrder = [
  'board_task', 'company_task', 'kpi_target', 'hyp_subtask', 'hyp_task',
  'hypothesis', 'contact', 'company', 'rejection_reason', 'strategy',
];
const insertOrder = [
  'strategy', 'rejection_reason', 'company', 'hypothesis', 'contact',
  'hyp_task', 'hyp_subtask', 'kpi_target',
];
const tableColumns = table => new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(column => column.name));
const insertRows = (table, rows) => {
  if (!rows?.length) return;
  const allowed = tableColumns(table);
  for (const source of rows) {
    const row = { ...source };
    if (table === 'company') Object.assign(row, { funnel_stage: 'new_signal', rejection_reason_id: null, rejection_comment: '', rejected_at: null, purge_at: null });
    if (table === 'contact') Object.assign(row, { crm_stage: 'signal', hypothesis_id: null, hyp_task_id: null, owner_name: 'Я', max_stage: null });
    const columns = Object.keys(row).filter(column => allowed.has(column));
    const placeholders = columns.map(() => '?').join(',');
    db.prepare(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`).run(...columns.map(column => {
      const value = row[column];
      return value === true ? 1 : value === false ? 0 : value;
    }));
  }
};

if (seed.strategy?.length !== 1 || seed.hypothesis?.length !== 3 || seed.company?.length !== 10) {
  throw new Error('Seed не соответствует ожидаемому набору для end-to-end теста');
}

db.exec('BEGIN IMMEDIATE');
try {
  for (const table of deleteOrder) db.exec(`DELETE FROM ${table}`);
  for (const table of insertOrder) insertRows(table, seed[table] || []);
  db.exec('COMMIT');
} catch (error) {
  db.exec('ROLLBACK');
  throw error;
}

const counts = Object.fromEntries(
  ['strategy', 'hypothesis', 'hyp_task', 'hyp_subtask', 'company', 'contact', 'company_task', 'board_task']
    .map(table => [table, db.prepare(`SELECT count(*) AS n FROM ${table}`).get().n]),
);
db.close();
console.log(JSON.stringify(counts));
