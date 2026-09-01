// Создаёт локальную SQLite-базу local/abm.db из schema.sqlite.sql
// и засевает одну чистую стратегию + 5 KPI (как прод при первичной настройке).
// Запуск:  node local/init-db.mjs [--reset]
import { DatabaseSync } from 'node:sqlite'
import { readFileSync, existsSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const dbPath = join(here, 'abm.db')
const schemaPath = join(here, 'schema.sqlite.sql')

if (process.argv.includes('--reset') && existsSync(dbPath)) {
  rmSync(dbPath)
  console.log('removed existing', dbPath)
}

const db = new DatabaseSync(dbPath)
db.exec('PRAGMA foreign_keys = ON;')
db.exec(readFileSync(schemaPath, 'utf8'))
console.log('schema applied')

// Мягкая миграция существующей local/abm.db без удаления данных.
const hasColumn = (table, column) => db.prepare(`PRAGMA table_info(${table})`).all().some((x) => x.name === column)
const addColumn = (table, column, definition) => {
  if (!hasColumn(table, column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`)
}
addColumn('hyp_task', 'aggregation_mode', "TEXT NOT NULL DEFAULT 'actions'")
addColumn('company', 'rejection_reason_id', 'TEXT REFERENCES rejection_reason(id) ON DELETE SET NULL')
addColumn('company', 'rejection_comment', "TEXT DEFAULT ''")
addColumn('company', 'rejected_at', 'TEXT')
addColumn('company', 'purge_at', 'TEXT')
addColumn('contact', 'hypothesis_id', 'TEXT REFERENCES hypothesis(id) ON DELETE SET NULL')
addColumn('contact', 'hyp_task_id', 'TEXT REFERENCES hyp_task(id) ON DELETE SET NULL')
addColumn('contact', 'owner_name', "TEXT DEFAULT 'Я'")
addColumn('contact', 'max_stage', 'TEXT')
addColumn('contact', 'response_status', "TEXT NOT NULL DEFAULT 'none' CHECK (response_status IN ('none','waiting','replied','ignored'))")
addColumn('company_task', 'record_kind', "TEXT NOT NULL DEFAULT 'task'")
addColumn('company_task', 'stage', 'TEXT')
addColumn('company_task', 'start_at', 'TEXT')
addColumn('company_task', 'started_at', 'TEXT')
addColumn('company_task', 'actual_at', 'TEXT')
addColumn('company_task', 'channel', "TEXT DEFAULT ''")
addColumn('company_task', 'owner_name', "TEXT DEFAULT 'Я'")
addColumn('board_task', 'start_at', 'TEXT')
addColumn('board_task', 'started_at', 'TEXT')
addColumn('board_task', 'owner_name', "TEXT DEFAULT 'Я'")
addColumn('board_task', 'priority', "TEXT NOT NULL DEFAULT 'B' CHECK (priority IN ('A','B','C'))")

// SQLite не умеет изменять CHECK через ALTER TABLE, поэтому аккуратно
// пересобираем только hypothesis и сохраняем все строки/ссылки.
const hypothesisDdl = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='hypothesis'").get()?.sql || ''
if (!hypothesisDdl.includes("'archived'")) {
  db.exec('PRAGMA foreign_keys = OFF')
  try {
    db.exec(`
      BEGIN IMMEDIATE;
      DROP TABLE IF EXISTS hypothesis_archive_new;
      CREATE TABLE hypothesis_archive_new (
        id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
        strategy_id TEXT NOT NULL REFERENCES strategy(id) ON DELETE CASCADE,
        code        TEXT DEFAULT '',
        title       TEXT NOT NULL DEFAULT 'Гипотеза',
        smart       TEXT DEFAULT '',
        status      TEXT NOT NULL DEFAULT 'idea' CHECK (status IN ('idea','in_work','validated','paused','rejected','archived')),
        priority    TEXT NOT NULL DEFAULT 'B' CHECK (priority IN ('A','B','C')),
        unit        TEXT DEFAULT 'Цель',
        plan        INTEGER NOT NULL DEFAULT 1,
        sort_order  INTEGER DEFAULT 0,
        created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
      );
      INSERT INTO hypothesis_archive_new (id,strategy_id,code,title,smart,status,priority,unit,plan,sort_order,created_at)
        SELECT id,strategy_id,code,title,smart,status,priority,unit,plan,sort_order,created_at FROM hypothesis;
      DROP TABLE hypothesis;
      ALTER TABLE hypothesis_archive_new RENAME TO hypothesis;
      CREATE INDEX IF NOT EXISTS idx_hyp_strategy ON hypothesis(strategy_id);
      COMMIT;
    `)
  } catch (error) {
    try { db.exec('ROLLBACK') } catch {}
    throw error
  } finally {
    db.exec('PRAGMA foreign_keys = ON')
  }
  const brokenLinks = db.prepare('PRAGMA foreign_key_check').all()
  if (brokenLinks.length) throw new Error(`Нарушены внешние ключи после миграции hypothesis: ${JSON.stringify(brokenLinks)}`)
  console.log('hypothesis archive status migration applied')
}
console.log('non-destructive migrations applied')

// Сид: одна стратегия + 5 KPI, если пусто
const cnt = db.prepare('SELECT count(*) n FROM strategy').get().n
if (cnt === 0) {
  const uuid = () =>
    (globalThis.crypto?.randomUUID?.() ??
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
      }))
  const sid = uuid()
  db.prepare('INSERT INTO strategy (id, name, quarter) VALUES (?, ?, ?)').run(sid, 'Новая стратегия', '')
  const ins = db.prepare('INSERT INTO kpi_target (id, strategy_id, kpi_key, unit) VALUES (?, ?, ?, ?)')
  for (const [k, u] of [
    ['new_touches', 'шт.'], ['new_meetings', 'шт.'], ['repeat_meetings', 'шт.'],
    ['agreements', 'шт.'], ['revenue', 'руб.'],
  ]) ins.run(uuid(), sid, k, u)
  console.log('seeded strategy + 5 kpi')
} else {
  console.log('strategy already present, skip seed')
}

// Проверка
const tables = ['strategy', 'kpi_target', 'hypothesis', 'hyp_task', 'hyp_subtask', 'rejection_reason', 'company', 'contact', 'company_task', 'board_task']
const counts = {}
for (const t of tables) counts[t] = db.prepare(`SELECT count(*) n FROM ${t}`).get().n
console.log('counts:', JSON.stringify(counts))
db.close()
console.log('DB ready at', dbPath)
