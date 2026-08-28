// Локальный дев-сервер для ABM: SQLite + подмножество PostgREST (как у Supabase).
// Отдаёт статику web/ и обслуживает /rest/v1/<table> (GET select=*, POST upsert, DELETE).
// Запуск:  node local/server.mjs      → http://localhost:8787
// Приложение в локальном режиме (localhost или ?local) ходит именно сюда.
import { DatabaseSync } from 'node:sqlite'
import { createServer } from 'node:http'
import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, extname, normalize } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const webDir = join(root, 'web')
const dbPath = join(here, 'abm.db')
const PORT = process.env.PORT || 8787

if (!existsSync(dbPath)) { console.error('Нет local/abm.db — сначала: node local/init-db.mjs'); process.exit(1) }
const db = new DatabaseSync(dbPath)
db.exec('PRAGMA foreign_keys = ON;')

const TABLES = new Set(['strategy','kpi_target','hypothesis','hyp_task','hyp_subtask','company','contact','company_task','board_task'])
const COL = /^[a-z_]+$/
const norm = v => v === undefined ? null : (v === true ? 1 : (v === false ? 0 : v))

const MIME = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.ico':'image/x-icon' }

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'apikey,authorization,content-type,prefer,x-client-info,accept-profile,content-profile,range,accept')
  res.setHeader('Access-Control-Expose-Headers', 'content-range')
}
const send = (res, code, body, headers = {}) => { cors(res); for (const k in headers) res.setHeader(k, headers[k]); res.writeHead(code); res.end(body) }
const json = (res, code, obj) => send(res, code, JSON.stringify(obj), { 'Content-Type': 'application/json' })

function parseFilters(search) {
  // ?id=in.("a","b")  ?id=not.is.null  ?col=eq.value   (select= игнорируем)
  const where = [], params = []
  for (const [k, raw] of new URLSearchParams(search)) {
    if (k === 'select' || k === 'order') continue
    if (!COL.test(k)) continue
    if (raw.startsWith('in.(')) {
      const inner = raw.slice(4, raw.lastIndexOf(')'))
      const vals = inner.length ? inner.split(',').map(s => s.replace(/^"(.*)"$/, '$1')) : ['\0none']
      where.push(`${k} IN (${vals.map(() => '?').join(',')})`); params.push(...vals)
    } else if (raw === 'not.is.null') {
      where.push(`${k} IS NOT NULL`)
    } else if (raw.startsWith('eq.')) {
      where.push(`${k} = ?`); params.push(raw.slice(3))
    }
  }
  return { clause: where.length ? ' WHERE ' + where.join(' AND ') : '', params }
}

function upsert(t, rows) {
  const arr = Array.isArray(rows) ? rows : [rows]
  const out = []
  const tx = db.prepare('SELECT 1') // noop
  for (const row of arr) {
    const cols = Object.keys(row).filter(c => COL.test(c))
    if (!cols.length) continue
    const ph = cols.map(() => '?').join(',')
    const upd = cols.filter(c => c !== 'id').map(c => `${c}=excluded.${c}`).join(',')
    const sql = `INSERT INTO ${t} (${cols.join(',')}) VALUES (${ph})` +
      (upd ? ` ON CONFLICT(id) DO UPDATE SET ${upd}` : ' ON CONFLICT(id) DO NOTHING')
    db.prepare(sql).run(...cols.map(c => norm(row[c])))
    out.push(row)
  }
  return out
}

const server = createServer((req, res) => {
  try {
    if (req.method === 'OPTIONS') return send(res, 204, '')
    const u = new URL(req.url, 'http://x')
    const path = u.pathname

    // ---- REST API ----
    if (path.startsWith('/rest/v1/')) {
      const t = path.slice('/rest/v1/'.length)
      if (!TABLES.has(t)) return json(res, 404, { message: 'unknown table ' + t })

      if (req.method === 'GET') {
        const { clause, params } = parseFilters(u.search.slice(1))
        const data = db.prepare(`SELECT * FROM ${t}${clause}`).all(...params)
        return json(res, 200, data)
      }
      if (req.method === 'POST') {
        let body = ''
        req.on('data', c => (body += c))
        req.on('end', () => {
          try { const rows = body ? JSON.parse(body) : []; const out = upsert(t, rows)
            const rep = (req.headers['prefer'] || '').includes('return=representation')
            return json(res, 201, rep ? out : [])
          } catch (e) { return json(res, 400, { message: String(e.message || e) }) }
        })
        return
      }
      if (req.method === 'DELETE') {
        const { clause, params } = parseFilters(u.search.slice(1))
        db.prepare(`DELETE FROM ${t}${clause}`).run(...params)
        return send(res, 204, '')
      }
      if (req.method === 'PATCH') {
        let body = ''
        req.on('data', c => (body += c))
        req.on('end', () => {
          try {
            const patch = JSON.parse(body || '{}')
            const cols = Object.keys(patch).filter(c => COL.test(c))
            const { clause, params } = parseFilters(u.search.slice(1))
            const setSql = cols.map(c => `${c}=?`).join(',')
            db.prepare(`UPDATE ${t} SET ${setSql}${clause}`).run(...cols.map(c => norm(patch[c])), ...params)
            return json(res, 200, [])
          } catch (e) { return json(res, 400, { message: String(e.message || e) }) }
        })
        return
      }
      return json(res, 405, { message: 'method not allowed' })
    }

    // ---- статика web/ ----
    let rel = path === '/' ? '/index.html' : path
    const file = normalize(join(webDir, rel))
    if (!file.startsWith(webDir) || !existsSync(file)) return send(res, 404, 'Not found')
    return send(res, 200, readFileSync(file), { 'Content-Type': MIME[extname(file)] || 'application/octet-stream' })
  } catch (e) {
    return json(res, 500, { message: String(e.message || e) })
  }
})

server.listen(PORT, () => {
  console.log(`ABM локально:  http://localhost:${PORT}`)
  console.log(`SQLite:        ${dbPath}`)
  console.log('Приложение в этом режиме пишет в локальную базу, прод-Supabase не трогается.')
})
