-- =====================================================================
--  ABM-сервис · локальная схема БД для SQLite (зеркало прод-Supabase)
--  Для локального теста, чтобы не трогать боевые данные.
--  Применение: node local/init-db.mjs  (создаёт local/abm.db)
--  ВАЖНО: при подключении включать  PRAGMA foreign_keys = ON;
-- =====================================================================

PRAGMA foreign_keys = ON;

-- Генератор UUID v4 для DEFAULT (чтобы вставки без id работали и локально).
-- (в приложении id всё равно приходят как crypto.randomUUID())

-- ---------- СТРАТЕГИЯ ----------
CREATE TABLE IF NOT EXISTS strategy (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  name            TEXT NOT NULL DEFAULT 'Новая стратегия',
  quarter         TEXT DEFAULT '',
  description     TEXT DEFAULT '',
  expected_effect TEXT DEFAULT '',
  sort_order      INTEGER DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS kpi_target (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  strategy_id  TEXT NOT NULL REFERENCES strategy(id) ON DELETE CASCADE,
  kpi_key      TEXT NOT NULL CHECK (kpi_key IN ('new_touches','new_meetings','repeat_meetings','agreements','revenue')),
  unit         TEXT NOT NULL DEFAULT 'шт.',
  plan_value   REAL NOT NULL DEFAULT 0,
  prev_q_value REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_kpi_strategy ON kpi_target(strategy_id);

-- ---------- ГИПОТЕЗЫ ----------
CREATE TABLE IF NOT EXISTS hypothesis (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  strategy_id TEXT NOT NULL REFERENCES strategy(id) ON DELETE CASCADE,
  code        TEXT DEFAULT '',
  title       TEXT NOT NULL DEFAULT 'Гипотеза',
  smart       TEXT DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'idea' CHECK (status IN ('idea','in_work','validated','paused','rejected')),
  priority    TEXT NOT NULL DEFAULT 'B' CHECK (priority IN ('A','B','C')),
  unit        TEXT DEFAULT 'Цель',
  plan        INTEGER NOT NULL DEFAULT 1,
  sort_order  INTEGER DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_hyp_strategy ON hypothesis(strategy_id);

CREATE TABLE IF NOT EXISTS hyp_task (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  hypothesis_id TEXT NOT NULL REFERENCES hypothesis(id) ON DELETE CASCADE,
  title         TEXT NOT NULL DEFAULT 'Задача',
  unit          TEXT DEFAULT 'КЕ',
  plan          INTEGER NOT NULL DEFAULT 1,
  priority      TEXT NOT NULL DEFAULT 'B' CHECK (priority IN ('A','B','C')),
  mode          TEXT NOT NULL DEFAULT 'manual' CHECK (mode IN ('manual','tracked')),
  track         TEXT CHECK (track IN ('touch','meeting','agreement')),
  sort_order    INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_htask_hyp ON hyp_task(hypothesis_id);

CREATE TABLE IF NOT EXISTS hyp_subtask (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  hyp_task_id TEXT NOT NULL REFERENCES hyp_task(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT 'Подзадача',
  is_done     INTEGER NOT NULL DEFAULT 0 CHECK (is_done IN (0,1)),
  sort_order  INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_subtask_task ON hyp_subtask(hyp_task_id);

-- ---------- КОМПАНИИ / КОНТАКТЫ ----------
CREATE TABLE IF NOT EXISTS company (
  id                       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  ext_no                   TEXT,
  name                     TEXT NOT NULL DEFAULT 'Без названия',
  inn                      TEXT DEFAULT '',
  priority                 TEXT DEFAULT 'B' CHECK (priority IN ('A','B','C')),
  segment                  TEXT DEFAULT '',
  category                 TEXT DEFAULT '',
  geography                TEXT DEFAULT '',
  why_fit                  TEXT DEFAULT '',
  signal_note              TEXT DEFAULT '',
  relevant_hypothesis_text TEXT DEFAULT '',
  what_to_check            TEXT DEFAULT '',
  who_to_find              TEXT DEFAULT '',
  extended_reason          TEXT DEFAULT '',
  first_message_template   TEXT DEFAULT '',
  second_message_template  TEXT DEFAULT '',
  funnel_stage             TEXT NOT NULL DEFAULT 'new_signal'
                             CHECK (funnel_stage IN ('new_signal','rejected','in_work','touched','met','agreement','revenue','excluded')),
  is_excluded              INTEGER NOT NULL DEFAULT 0 CHECK (is_excluded IN (0,1)),
  excluded_reason          TEXT DEFAULT '',
  revenue_amount           REAL NOT NULL DEFAULT 0,
  created_at               TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  last_activity_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_company_ext_no ON company(ext_no);

CREATE TABLE IF NOT EXISTS contact (
  id                 TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  company_id         TEXT REFERENCES company(id) ON DELETE SET NULL,
  ext_company_no     TEXT DEFAULT '',
  company_name       TEXT DEFAULT '',
  priority           TEXT DEFAULT '',
  segment            TEXT DEFAULT '',
  role_target        TEXT DEFAULT '',
  contact_no         TEXT DEFAULT '',
  full_name          TEXT NOT NULL DEFAULT '',
  position           TEXT DEFAULT '',
  phone              TEXT DEFAULT '',
  email              TEXT DEFAULT '',
  telegram           TEXT DEFAULT '',
  tenchat            TEXT DEFAULT '',
  network            TEXT DEFAULT '',
  linkedin           TEXT DEFAULT '',
  other_social       TEXT DEFAULT '',
  source             TEXT DEFAULT '',
  last_digital_trace TEXT DEFAULT '',
  last_trace_date    TEXT DEFAULT '',
  check_date         TEXT DEFAULT '',
  confidence         TEXT DEFAULT '',
  comment            TEXT DEFAULT '',
  how_to_get         TEXT DEFAULT '',
  status             TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','excluded')),
  excluded_reason    TEXT DEFAULT '',
  crm_stage          TEXT,
  created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_contact_company ON contact(company_id);

-- ---------- ЗАДАЧИ ПО КОМПАНИИ ----------
CREATE TABLE IF NOT EXISTS company_task (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  company_id    TEXT NOT NULL REFERENCES company(id) ON DELETE CASCADE,
  contact_id    TEXT REFERENCES contact(id) ON DELETE SET NULL,
  hypothesis_id TEXT REFERENCES hypothesis(id) ON DELETE SET NULL,
  hyp_task_id   TEXT REFERENCES hyp_task(id) ON DELETE SET NULL,
  title         TEXT NOT NULL DEFAULT '',
  description   TEXT DEFAULT '',
  type          TEXT NOT NULL CHECK (type IN ('analyze_signal','touch_new','touch_repeat','meeting_new','meeting_repeat','agreement','custom')),
  status        TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','waiting','done','cancelled')),
  result_note   TEXT DEFAULT '',
  is_next_step  INTEGER NOT NULL DEFAULT 0 CHECK (is_next_step IN (0,1)),
  due_at        TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at  TEXT,
  cycle         INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_task_company ON company_task(company_id);
CREATE INDEX IF NOT EXISTS idx_task_contact ON company_task(contact_id);
CREATE INDEX IF NOT EXISTS idx_task_hyptask ON company_task(hyp_task_id);
CREATE INDEX IF NOT EXISTS idx_task_status  ON company_task(status);

-- ---------- ДОСКА ЗАДАЧ (канбан по гипотезам) ----------
CREATE TABLE IF NOT EXISTS board_task (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-'||substr('89ab',abs(random())%4+1,1)||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
  strategy_id   TEXT REFERENCES strategy(id) ON DELETE CASCADE,
  hypothesis_id TEXT REFERENCES hypothesis(id) ON DELETE SET NULL,
  hyp_task_id   TEXT REFERENCES hyp_task(id) ON DELETE SET NULL,
  title         TEXT NOT NULL DEFAULT 'Новая задача',
  status        TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','in_work','deferred','done')),
  due_at        TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  completed_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_board_strategy ON board_task(strategy_id);
