// =====================================================================
//  Пример слоя данных ABM ↔ Supabase (framework-agnostic).
//  Показывает маппинг таблиц в состояние приложения и обратно.
//  В React-проекте это станет src/lib/api.ts. Здесь — для наглядности.
//
//  Установка клиента:  npm i @supabase/supabase-js
// =====================================================================
import { createClient } from '@supabase/supabase-js'

// URL и anon-ключ — из Supabase → Project Settings → API.
// В реальном проекте берём из переменных окружения (.env):
//   VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

// ---------- ЧТЕНИЕ: собрать всё состояние приложения ----------
// Возвращает ту же форму state, что использует прототип:
//   { strategies:[{...,kpiTargets,hypotheses,hypTasks,hypSubtasks}], currentStrategyId, companies, contacts, tasks }
export async function fetchState() {
  const [strategies, kpis, hyps, htasks, subs, companies, contacts, tasks] = await Promise.all([
    supabase.from('strategy').select('*').order('sort_order'),
    supabase.from('kpi_target').select('*'),
    supabase.from('hypothesis').select('*').order('sort_order'),
    supabase.from('hyp_task').select('*').order('sort_order'),
    supabase.from('hyp_subtask').select('*').order('sort_order'),
    supabase.from('company').select('*').order('created_at'),
    supabase.from('contact').select('*').order('created_at'),
    supabase.from('company_task').select('*').order('created_at'),
  ]).then(rs => rs.map(r => { if (r.error) throw r.error; return r.data }))

  const byStrategy = strategies.map(s => ({
    ...s,
    kpiTargets: kpis.filter(k => k.strategy_id === s.id),
    hypotheses: hyps.filter(h => h.strategy_id === s.id),
    hypTasks: htasks.filter(t => hyps.some(h => h.id === t.hypothesis_id && h.strategy_id === s.id)),
    hypSubtasks: subs.filter(x => htasks.some(t => t.id === x.hyp_task_id
      && hyps.some(h => h.id === t.hypothesis_id && h.strategy_id === s.id))),
  }))

  return {
    strategies: byStrategy,
    currentStrategyId: byStrategy[0]?.id ?? null,
    companies,
    contacts,
    tasks, // company_task
  }
}

// ---------- ЗАПИСЬ: гранулярные операции ----------
// Каждое действие движка = один-два запроса. Примеры:

export const api = {
  // Компании / воронка
  async takeToWork(companyId) {
    await supabase.from('company').update({ funnel_stage: 'in_work', last_activity_at: new Date().toISOString() }).eq('id', companyId)
    return supabase.from('company_task').insert({
      company_id: companyId, title: 'Разобрать сигнал', type: 'analyze_signal', status: 'planned',
    }).select().single()
  },
  rejectSignal: (id) => supabase.from('company').update({ funnel_stage: 'rejected' }).eq('id', id),

  // Задачи
  addStep: (d) => supabase.from('company_task').insert({
    company_id: d.companyId, contact_id: d.contactId ?? null, hypothesis_id: d.hypId ?? null,
    hyp_task_id: d.hypTaskId ?? null, title: d.title, type: d.type, status: 'planned',
    is_next_step: true, due_at: d.due ?? null,
  }).select().single(),

  async completeTask(taskId, note, movesStageTo, companyId, next) {
    await supabase.from('company_task').update({ status: 'done', result_note: note, completed_at: new Date().toISOString() }).eq('id', taskId)
    const patch = { last_activity_at: new Date().toISOString() }
    if (movesStageTo) patch.funnel_stage = movesStageTo // рост стадии считаем в движке и передаём сюда
    await supabase.from('company').update(patch).eq('id', companyId)
    if (next) await this.addStep({ companyId, ...next })
  },

  // ЛПР
  excludeContact: (id, reason) => supabase.from('contact').update({ status: 'excluded', excluded_reason: reason }).eq('id', id),

  // Гипотезы
  toggleSubtask: (id, val) => supabase.from('hyp_subtask').update({ is_done: val }).eq('id', id),
  addHypTask: (hypId, d) => supabase.from('hyp_task').insert({ hypothesis_id: hypId, title: d.title, unit: d.unit, plan: d.plan, priority: d.priority, mode: 'manual' }),
  addSubtask: (htId, title) => supabase.from('hyp_subtask').insert({ hyp_task_id: htId, title }),

  // Идемпотентный импорт компании по № (ext_no)
  upsertCompany: (row) => supabase.from('company').upsert(row, { onConflict: 'ext_no' }).select().single(),
}

// ---------- РЕАЛТАЙМ (по желанию) ----------
// Подписка: когда любой пользователь меняет данные — перезагрузить состояние.
export function subscribe(onChange) {
  return supabase.channel('abm')
    .on('postgres_changes', { event: '*', schema: 'public' }, onChange)
    .subscribe()
}
