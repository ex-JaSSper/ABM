import type {
  AppState,
  Company,
  CompanyTask,
  FunnelStage,
  Hypothesis,
  KpiKey,
  TaskType,
} from '../types'

// ---- Справочники типов задач (раздел 4.4) ----

export const TASK_TYPE_META: Record<
  TaskType,
  { label: string; metric: KpiKey | null; movesStageTo: FunnelStage | null }
> = {
  analyze_signal: { label: 'Разобрать сигнал', metric: null, movesStageTo: 'in_work' },
  touch_new: { label: 'Новое касание', metric: 'new_touches', movesStageTo: 'touched' },
  touch_repeat: { label: 'Повторное касание', metric: null, movesStageTo: null },
  meeting_new: { label: 'Новая встреча', metric: 'new_meetings', movesStageTo: 'met' },
  meeting_repeat: { label: 'Повторная встреча', metric: 'repeat_meetings', movesStageTo: null },
  agreement: { label: 'Договорённость / пилот', metric: 'agreements', movesStageTo: 'agreement' },
  custom: { label: 'Свободная задача', metric: null, movesStageTo: null },
}

// Типы, которые оператор может назначить как «следующий шаг».
export const NEXT_STEP_TYPES: TaskType[] = [
  'touch_new',
  'touch_repeat',
  'meeting_new',
  'meeting_repeat',
  'agreement',
  'custom',
]

// ---- Порядок стадий воронки ----

const STAGE_ORDER: FunnelStage[] = [
  'new_signal',
  'in_work',
  'touched',
  'met',
  'agreement',
  'revenue',
]

export const STAGE_LABEL: Record<FunnelStage, string> = {
  new_signal: 'Новый сигнал',
  rejected: 'Отклонён',
  in_work: 'В работе',
  touched: 'Касание',
  met: 'Встреча',
  agreement: 'Договорённость',
  revenue: 'Выручка',
  excluded: 'Исключена',
}

export function stageRank(stage: FunnelStage): number {
  const i = STAGE_ORDER.indexOf(stage)
  return i === -1 ? -1 : i
}

// Стадия только растёт. Терминальные rejected/excluded/revenue проставляются явно.
export function nextStage(current: FunnelStage, target: FunnelStage | null): FunnelStage {
  if (!target) return current
  return stageRank(target) > stageRank(current) ? target : current
}

const ACTIVE_STAGES: FunnelStage[] = ['in_work', 'touched', 'met', 'agreement']

export function isActive(c: Company): boolean {
  return ACTIVE_STAGES.includes(c.funnel_stage) && !c.is_excluded
}

// ---- Метрики (8.1): счётчики с повторами ----

export interface Metrics {
  new_touches: number
  repeat_touches: number
  new_meetings: number
  repeat_meetings: number
  agreements: number
  revenue: number
}

export function computeMetrics(state: AppState): Metrics {
  const done = state.tasks.filter((t) => t.status === 'done')
  const count = (type: TaskType) => done.filter((t) => t.type === type).length
  return {
    new_touches: count('touch_new'),
    repeat_touches: count('touch_repeat'),
    new_meetings: count('meeting_new'),
    repeat_meetings: count('meeting_repeat'),
    agreements: count('agreement'),
    revenue: state.companies.reduce((s, c) => s + (c.revenue_amount || 0), 0),
  }
}

// ---- Воронка (8.2): уникальные клиенты по накопительной стадии ----

export interface FunnelBar {
  key: string
  label: string
  value: number
}

export function computeFunnel(state: AppState): FunnelBar[] {
  const cs = state.companies
  const reached = (stage: FunnelStage) =>
    cs.filter((c) => stageRank(c.funnel_stage) >= stageRank(stage)).length
  return [
    { key: 'all', label: 'Выгружено', value: cs.length },
    { key: 'in_work', label: 'В разбор', value: reached('in_work') },
    { key: 'touched', label: 'Касание', value: reached('touched') },
    { key: 'met', label: 'Встреча', value: reached('met') },
    { key: 'revenue', label: 'Выручка', value: cs.filter((c) => c.funnel_stage === 'revenue').length },
  ]
}

// ---- KPI план/факт (раздел 11) ----

export interface KpiRow {
  kpi_key: KpiKey
  label: string
  unit: string
  plan: number
  fact: number
  completion: number // %
  delta: number // факт - прошлый Q
  prevQ: number
}

const KPI_LABEL: Record<KpiKey, string> = {
  new_touches: 'Количество новых касаний',
  new_meetings: 'Количество новых встреч',
  repeat_meetings: 'Количество повторных встреч',
  agreements: 'Выход на договорённости',
  revenue: 'Выручка',
}

export function computeKpiRows(state: AppState): KpiRow[] {
  const m = computeMetrics(state)
  const factByKey: Record<KpiKey, number> = {
    new_touches: m.new_touches,
    new_meetings: m.new_meetings,
    repeat_meetings: m.repeat_meetings,
    agreements: m.agreements,
    revenue: m.revenue,
  }
  return state.kpiTargets.map((t) => {
    const fact = factByKey[t.kpi_key] ?? 0
    return {
      kpi_key: t.kpi_key,
      label: KPI_LABEL[t.kpi_key],
      unit: t.unit,
      plan: t.plan_value,
      fact,
      completion: t.plan_value > 0 ? Math.round((fact / t.plan_value) * 100) : 0,
      delta: fact - t.prev_q_value,
      prevQ: t.prev_q_value,
    }
  })
}

// ---- Механика фокуса (раздел 9) ----

const STAGE_WEIGHT: Partial<Record<FunnelStage, number>> = {
  in_work: 1,
  touched: 2,
  met: 3,
  agreement: 5,
}

export interface FocusItem {
  company: Company
  openTask: CompanyTask | null
  stalled: boolean
  overdue: boolean
  idleDays: number
  priority: number
}

const DAY = 1000 * 60 * 60 * 24

export function openTaskFor(state: AppState, companyId: string): CompanyTask | null {
  return (
    state.tasks.find(
      (t) => t.company_id === companyId && (t.status === 'planned' || t.status === 'waiting'),
    ) ?? null
  )
}

export function computeFocus(state: AppState, now = Date.now()): FocusItem[] {
  const items: FocusItem[] = state.companies
    .filter(isActive)
    .map((company) => {
      const openTask = openTaskFor(state, company.id)
      const idleDays = Math.max(
        0,
        Math.floor((now - new Date(company.last_activity_at).getTime()) / DAY),
      )
      const overdue = !!openTask?.due_at && new Date(openTask.due_at).getTime() < now
      const stalled = !openTask || overdue
      const weight = STAGE_WEIGHT[company.funnel_stage] ?? 1
      const priority = weight * (idleDays + 1)
      return { company, openTask, stalled, overdue, idleDays, priority }
    })
  // Зависшие сверху, затем по приоритету.
  return items.sort((a, b) => {
    if (a.stalled !== b.stalled) return a.stalled ? -1 : 1
    return b.priority - a.priority
  })
}

// ---- Прогресс гипотез (раздел 7) ----

export function taskProgress(state: AppState, hypTaskId: string): number {
  const subs = state.hypSubtasks.filter((s) => s.hyp_task_id === hypTaskId)
  if (subs.length === 0) return 0
  return subs.filter((s) => s.is_done).length / subs.length
}

// progress(hypothesis) = сумма done-подзадач / сумма всех подзадач её задач.
export function hypothesisProgress(state: AppState, hyp: Hypothesis): number {
  const taskIds = state.hypTasks.filter((t) => t.hypothesis_id === hyp.id).map((t) => t.id)
  const subs = state.hypSubtasks.filter((s) => taskIds.includes(s.hyp_task_id))
  if (subs.length === 0) return 0
  return subs.filter((s) => s.is_done).length / subs.length
}

// ---- Форматирование ----

export function fmtNum(n: number): string {
  return new Intl.NumberFormat('ru-RU').format(n)
}

export function fmtMoney(n: number): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short', year: 'numeric' })
}
