// Полное зеркалирование local/abm.db -> production Supabase.
// Перед заменой всегда сохраняет удалённый JSON-бэкап. При сбое импорта
// пытается восстановить исходное состояние production.
//
// Read-only backup:
//   node local/sync-sqlite-to-supabase.mjs --backup-only
// Replacement after schema migration:
//   node local/sync-sqlite-to-supabase.mjs --replace --confirm-production

import fs from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const dbPath = path.join(here, 'abm.db');
const webPath = path.join(root, 'web', 'index.html');
const backupDir = path.join(here, 'backups');
const args = new Set(process.argv.slice(2));

const tables = [
  'strategy', 'kpi_target', 'hypothesis', 'hyp_task', 'hyp_subtask',
  'rejection_reason', 'company', 'contact', 'company_task', 'board_task',
];
const deleteOrder = [
  'board_task', 'company_task', 'kpi_target', 'hyp_subtask', 'hyp_task',
  'hypothesis', 'contact', 'company', 'rejection_reason', 'strategy',
];
const insertOrder = [
  'strategy', 'rejection_reason', 'company', 'hypothesis', 'contact',
  'hyp_task', 'hyp_subtask', 'kpi_target', 'company_task', 'board_task',
];
const booleanColumns = {
  hyp_subtask: new Set(['is_done']),
  rejection_reason: new Set(['active']),
  company: new Set(['is_excluded']),
};

const web = await fs.readFile(webPath, 'utf8');
const baseUrl = web.match(/https:\/\/[a-z]+\.supabase\.co/)?.[0];
const apiKey = web.match(/sb_publishable_[A-Za-z0-9_-]+/)?.[0];
if (!baseUrl || !apiKey) throw new Error('Supabase URL/key не найдены в web/index.html');

const headers = {
  apikey: apiKey,
  authorization: `Bearer ${apiKey}`,
  'content-type': 'application/json',
};

async function request(table, options = {}, query = 'select=*', allowMissing = false) {
  const response = await fetch(`${baseUrl}/rest/v1/${table}?${query}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const text = response.status === 204 ? '' : await response.text();
  if (!response.ok) {
    if (allowMissing && response.status === 404 && text.includes('PGRST205')) return null;
    throw new Error(`${table}: HTTP ${response.status}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function readRemote(allowMissing = false) {
  const data = {};
  const missing = [];
  for (const table of tables) {
    const rows = await request(table, {}, 'select=*', allowMissing);
    if (rows === null) missing.push(table);
    data[table] = rows || [];
  }
  return { data, missing };
}

async function backupRemote(label, allowMissing = false) {
  const snapshot = await readRemote(allowMissing);
  await fs.mkdir(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `supabase-${label}-${stamp}.json`);
  await fs.writeFile(backupPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  return { ...snapshot, backupPath };
}

function readLocal() {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  try {
    return Object.fromEntries(tables.map(table => {
      const rows = db.prepare(`select * from ${table}`).all().map(source => {
        const row = { ...source };
        for (const column of booleanColumns[table] || []) row[column] = Boolean(row[column]);
        return row;
      });
      return [table, rows];
    }));
  } finally {
    db.close();
  }
}

function validate(data) {
  for (const table of tables) {
    if (!Array.isArray(data[table])) throw new Error(`Нет массива ${table}`);
    const ids = data[table].map(row => row.id);
    if (ids.some(id => !id) || new Set(ids).size !== ids.length) throw new Error(`Некорректные id в ${table}`);
  }
  const strategyIds = new Set(data.strategy.map(row => row.id));
  const hypothesisIds = new Set(data.hypothesis.map(row => row.id));
  const hypTaskIds = new Set(data.hyp_task.map(row => row.id));
  const companyIds = new Set(data.company.map(row => row.id));
  const contactIds = new Set(data.contact.map(row => row.id));
  if (data.kpi_target.some(row => !strategyIds.has(row.strategy_id))) throw new Error('KPI ссылается на неизвестную стратегию');
  if (data.hypothesis.some(row => !strategyIds.has(row.strategy_id))) throw new Error('Гипотеза ссылается на неизвестную стратегию');
  if (data.hyp_task.some(row => !hypothesisIds.has(row.hypothesis_id))) throw new Error('Задача ссылается на неизвестную гипотезу');
  if (data.hyp_subtask.some(row => !hypTaskIds.has(row.hyp_task_id))) throw new Error('Подзадача ссылается на неизвестную задачу');
  if (data.contact.some(row => row.company_id && !companyIds.has(row.company_id))) throw new Error('Контакт ссылается на неизвестную компанию');
  if (data.company_task.some(row => !companyIds.has(row.company_id) || (row.contact_id && !contactIds.has(row.contact_id)))) throw new Error('CRM-задача имеет неизвестную связь');
}

async function clearRemote() {
  for (const table of deleteOrder) await request(table, { method: 'DELETE' }, 'id=not.is.null');
}

async function insertRemote(data) {
  for (const table of insertOrder) {
    const rows = data[table] || [];
    for (let start = 0; start < rows.length; start += 50) {
      await request(table, {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(rows.slice(start, start + 50)),
      }, '');
    }
  }
}

const counts = data => Object.fromEntries(tables.map(table => [table, data[table]?.length || 0]));

if (args.has('--backup-only')) {
  const backup = await backupRemote('before-stage-migration', true);
  console.log('Backup:', backup.backupPath);
  console.log('Missing tables:', backup.missing.length ? backup.missing.join(', ') : 'none');
  console.log('Counts:', JSON.stringify(counts(backup.data)));
  process.exit(0);
}

if (!args.has('--replace') || !args.has('--confirm-production')) {
  throw new Error('Для замены нужны флаги --replace --confirm-production');
}

const local = readLocal();
validate(local);
const backup = await backupRemote('before-stage-replace');
console.log('Backup:', backup.backupPath);
console.log('Production before:', JSON.stringify(counts(backup.data)));
console.log('SQLite source:', JSON.stringify(counts(local)));

try {
  await clearRemote();
  await insertRemote(local);
} catch (error) {
  console.error('Импорт не завершён; восстанавливаю production-бэкап…');
  try {
    await clearRemote();
    await insertRemote(backup.data);
    console.error('Production восстановлен из бэкапа.');
  } catch (restoreError) {
    console.error('Автовосстановление не удалось:', restoreError.message || restoreError);
  }
  throw error;
}

const after = (await readRemote()).data;
const expected = counts(local);
const actual = counts(after);
if (JSON.stringify(expected) !== JSON.stringify(actual)) {
  throw new Error(`Контрольные количества не совпали: expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`);
}
console.log('Production after:', JSON.stringify(actual));
console.log('SQLite и production синхронизированы.');
