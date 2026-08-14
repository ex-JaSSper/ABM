// Доменная модель ABM-сервиса. Соответствует разделу 4 ТЗ.

export type FunnelStage =
  | 'new_signal' // загружена, не разобрана
  | 'rejected' // отсеяна на отвесе (терминал)
  | 'in_work' // взята в работу / в разборе
  | 'touched' // есть >=1 завершённое касание
  | 'met' // есть >=1 завершённая встреча
  | 'agreement' // договорённость / пилот
  | 'revenue' // оплата
  | 'excluded' // выбыла в процессе (терминал)

export type TaskType =
  | 'analyze_signal'
  | 'touch_new'
  | 'touch_repeat'
  | 'meeting_new'
  | 'meeting_repeat'
  | 'agreement'
  | 'custom'

export type TaskStatus = 'planned' | 'waiting' | 'done' | 'cancelled'

export type KpiKey =
  | 'new_touches'
  | 'new_meetings'
  | 'repeat_meetings'
  | 'agreements'
  | 'revenue'

export interface Strategy {
  id: string
  name: string
  quarter: string // '2026-Q3'
  created_at: string
}

export interface KpiTarget {
  id: string
  strategy_id: string
  kpi_key: KpiKey
  unit: 'шт.' | 'руб.'
  plan_value: number
  prev_q_value: number
}

export interface Hypothesis {
  id: string
  strategy_id: string
  title: string
  description: string
  is_active: boolean
  created_at: string
}

export interface HypTask {
  id: string
  hypothesis_id: string
  title: string
  description: string
  sort_order: number
}

export interface HypSubtask {
  id: string
  hyp_task_id: string
  title: string
  is_done: boolean
  sort_order: number
}

export interface Company {
  id: string
  ext_no: string
  name: string
  priority: 'A' | 'B' | 'C'
  segment: string
  category: string
  geography: string
  why_fit: string
  signal_note: string
  relevant_hypothesis_text: string
  what_to_check: string
  who_to_find: string
  extended_reason: string
  first_message_template: string
  second_message_template: string
  funnel_stage: FunnelStage
  is_excluded: boolean
  excluded_reason: string
  revenue_amount: number // зафиксированная выручка (руб.)
  created_at: string
  last_activity_at: string
}

export interface Contact {
  id: string
  company_id: string | null // null => unmatched
  ext_company_no: string
  company_name: string
  priority: string
  segment: string
  role_target: string
  contact_no: string
  full_name: string
  position: string
  phone: string
  email: string
  telegram: string
  tenchat: string
  network: string
  linkedin: string
  other_social: string
  source: string
  last_digital_trace: string
  last_trace_date: string
  check_date: string
  confidence: string
  comment: string
  how_to_get: string
}

export interface CompanyTask {
  id: string
  company_id: string
  title: string
  description: string
  type: TaskType
  status: TaskStatus
  result_note: string
  is_next_step: boolean
  due_at: string | null
  created_at: string
  completed_at: string | null
}

export interface AppState {
  strategy: Strategy
  kpiTargets: KpiTarget[]
  hypotheses: Hypothesis[]
  hypTasks: HypTask[]
  hypSubtasks: HypSubtask[]
  companies: Company[]
  contacts: Contact[]
  tasks: CompanyTask[]
}
