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
const tables = ['strategy', 'kpi_target', 'hypothesis', 'hyp_task', 'hyp_subtask', 'company', 'contact', 'company_task', 'board_task']
const counts = {}
for (const t of tables) counts[t] = db.prepare(`SELECT count(*) n FROM ${t}`).get().n
console.log('counts:', JSON.stringify(counts))
db.close()
console.log('DB ready at', dbPath)
