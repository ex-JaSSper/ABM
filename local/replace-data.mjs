// Полная замена данных ABM в Supabase на подготовленный seed-файл.
// Создаёт локальный JSON-бэкап перед удалением и пытается восстановить его
// при ошибке импорта.
//
// Запуск:
//   node local/replace-data.mjs --remote --confirm-replace
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const seedPath = path.join(root, 'supabase', 'seed-digital-efficiency-2026-08.json');
const webPath = path.join(root, 'web', 'index.html');
const backupDir = path.join(here, 'backups');
const args = new Set(process.argv.slice(2));

if (!args.has('--remote')) throw new Error('Укажите целевой контур: --remote');
if (!args.has('--confirm-replace')) throw new Error('Замена удаляет текущие данные. Добавьте --confirm-replace');

const seed = JSON.parse(await fs.readFile(seedPath, 'utf8'));
const tables = ['strategy', 'kpi_target', 'hypothesis', 'hyp_task', 'hyp_subtask', 'company', 'contact', 'company_task'];
const deleteOrder = ['company_task', 'kpi_target', 'hyp_subtask', 'hyp_task', 'hypothesis', 'contact', 'company', 'strategy'];
const insertOrder = ['strategy', 'company', 'hypothesis', 'contact', 'hyp_task', 'hyp_subtask', 'kpi_target', 'company_task'];

function validate(data) {
  for (const table of tables) {
    if (!Array.isArray(data[table])) throw new Error(`В seed отсутствует массив ${table}`);
    const ids = data[table].map(row => row.id);
    if (ids.some(id => !id)) throw new Error(`В ${table} есть запись без id`);
    if (new Set(ids).size !== ids.length) throw new Error(`В ${table} есть повторяющиеся id`);
  }
  const strategyIds = new Set(data.strategy.map(row => row.id));
  const hypothesisIds = new Set(data.hypothesis.map(row => row.id));
  const hypTaskIds = new Set(data.hyp_task.map(row => row.id));
  const companyIds = new Set(data.company.map(row => row.id));
  if (data.kpi_target.some(row => !strategyIds.has(row.strategy_id))) throw new Error('KPI ссылается на неизвестную стратегию');
  if (data.hypothesis.some(row => !strategyIds.has(row.strategy_id))) throw new Error('Гипотеза ссылается на неизвестную стратегию');
  if (data.hyp_task.some(row => !hypothesisIds.has(row.hypothesis_id))) throw new Error('Задача ссылается на неизвестную гипотезу');
  if (data.hyp_subtask.some(row => !hypTaskIds.has(row.hyp_task_id))) throw new Error('Подзадача ссылается на неизвестную задачу');
  if (data.contact.some(row => !companyIds.has(row.company_id))) throw new Error('Контакт ссылается на неизвестную компанию');
  if (data.company.some(row => !String(row.name || '').trim())) throw new Error('Есть компания без названия');
  if (data.contact.some(row => !String(row.full_name || '').trim())) throw new Error('Есть контакт без имени');
}

validate(seed);

const web = await fs.readFile(webPath, 'utf8');
const baseUrl = web.match(/https:\/\/[a-z]+\.supabase\.co/)?.[0];
const apiKey = web.match(/sb_publishable_[A-Za-z0-9_-]+/)?.[0];
if (!baseUrl || !apiKey) throw new Error('Не удалось прочитать Supabase URL/key из web/index.html');

const headers = {
  apikey: apiKey,
  authorization: `Bearer ${apiKey}`,
  'content-type': 'application/json',
};

async function request(table, options = {}, query = 'select=*') {
  const response = await fetch(`${baseUrl}/rest/v1/${table}?${query}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${table}: HTTP ${response.status}: ${body.slice(0, 500)}`);
  }
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function readAll() {
  const result = {};
  for (const table of tables) result[table] = await request(table);
  return result;
}

async function clearAll() {
  for (const table of deleteOrder) {
    await request(table, { method: 'DELETE' }, 'id=not.is.null');
  }
}

async function insertAll(data) {
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

await fs.mkdir(backupDir, { recursive: true });
console.log('Проверяю текущую базу…');
const backup = await readAll();
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupPath = path.join(backupDir, `supabase-before-replace-${stamp}.json`);
await fs.writeFile(backupPath, JSON.stringify(backup, null, 2) + '\n', 'utf8');
console.log('Бэкап:', backupPath);
console.log('До замены:', JSON.stringify(Object.fromEntries(tables.map(table => [table, backup[table].length]))));

try {
  console.log('Удаляю старые данные…');
  await clearAll();
  console.log('Загружаю новую стратегию и базу компаний…');
  await insertAll(seed);
} catch (error) {
  console.error('Импорт завершился ошибкой; восстанавливаю исходный бэкап…');
  try {
    await clearAll();
    await insertAll(backup);
    console.error('Исходные данные восстановлены.');
  } catch (restoreError) {
    console.error('Автовосстановление не удалось:', restoreError.message || restoreError);
  }
  throw error;
}

const after = await readAll();
const counts = Object.fromEntries(tables.map(table => [table, after[table].length]));
console.log('После замены:', JSON.stringify(counts));

if (counts.strategy !== seed.strategy.length ||
    counts.hypothesis !== seed.hypothesis.length ||
    counts.company !== seed.company.length ||
    counts.contact !== seed.contact.length) {
  throw new Error(`Контрольные количества не совпали: ${JSON.stringify(counts)}`);
}
console.log('Замена данных завершена успешно.');
