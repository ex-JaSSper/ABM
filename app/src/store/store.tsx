import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { AppState, CompanyTask, FunnelStage, Hypothesis, TaskType } from '../types'
import { initialState } from '../data/mock'
import { TASK_TYPE_META, nextStage, openTaskFor } from '../lib/engine'

const STORAGE_KEY = 'abm-state-v1'

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as AppState
  } catch {
    /* ignore */
  }
  return initialState
}

const uid = () => Math.random().toString(36).slice(2, 10)

interface StoreApi {
  state: AppState
  reset: () => void
  // Воронка / сигналы
  takeToWork: (companyId: string) => void
  rejectSignal: (companyId: string) => void
  excludeCompany: (companyId: string, reason: string) => void
  recordRevenue: (companyId: string, amount: number) => void
  // Задачи
  completeTask: (
    taskId: string,
    resultNote: string,
    next?: { type: TaskType; title: string; due_at: string | null },
  ) => void
  addNextStep: (companyId: string, type: TaskType, title: string, due_at: string | null) => void
  cancelTask: (taskId: string) => void
  // Гипотезы
  toggleSubtask: (subtaskId: string) => void
  addHypothesis: (title: string, description: string) => void
  updateHypothesis: (id: string, patch: Partial<Hypothesis>) => void
  deleteHypothesis: (id: string) => void
}

const StoreContext = createContext<StoreApi | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(load)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const api = useMemo<StoreApi>(() => {
    const nowIso = () => new Date().toISOString()

    const takeToWork = (companyId: string) =>
      setState((s) => {
        const task: CompanyTask = {
          id: uid(),
          company_id: companyId,
          title: 'Разобрать сигнал',
          description: 'Вчитаться в компанию, определить предложение.',
          type: 'analyze_signal',
          status: 'planned',
          result_note: '',
          is_next_step: false,
          due_at: null,
          created_at: nowIso(),
          completed_at: null,
        }
        return {
          ...s,
          companies: s.companies.map((c) =>
            c.id === companyId ? { ...c, funnel_stage: 'in_work' as FunnelStage, last_activity_at: nowIso() } : c,
          ),
          tasks: [...s.tasks, task],
        }
      })

    const rejectSignal = (companyId: string) =>
      setState((s) => ({
        ...s,
        companies: s.companies.map((c) =>
          c.id === companyId ? { ...c, funnel_stage: 'rejected' as FunnelStage } : c,
        ),
      }))

    const excludeCompany = (companyId: string, reason: string) =>
      setState((s) => ({
        ...s,
        companies: s.companies.map((c) =>
          c.id === companyId
            ? { ...c, funnel_stage: 'excluded' as FunnelStage, is_excluded: true, excluded_reason: reason }
            : c,
        ),
        tasks: s.tasks.map((t) =>
          t.company_id === companyId && (t.status === 'planned' || t.status === 'waiting')
            ? { ...t, status: 'cancelled' as const }
            : t,
        ),
      }))

    const recordRevenue = (companyId: string, amount: number) =>
      setState((s) => ({
        ...s,
        companies: s.companies.map((c) =>
          c.id === companyId
            ? { ...c, funnel_stage: 'revenue' as FunnelStage, revenue_amount: amount, last_activity_at: nowIso() }
            : c,
        ),
      }))

    const completeTask: StoreApi['completeTask'] = (taskId, resultNote, next) =>
      setState((s) => {
        const task = s.tasks.find((t) => t.id === taskId)
        if (!task) return s
        const meta = TASK_TYPE_META[task.type]
        const companyId = task.company_id

        let tasks = s.tasks.map((t) =>
          t.id === taskId
            ? { ...t, status: 'done' as const, result_note: resultNote, completed_at: nowIso() }
            : t,
        )
        if (next) {
          tasks = [
            ...tasks,
            {
              id: uid(),
              company_id: companyId,
              title: next.title || TASK_TYPE_META[next.type].label,
              description: '',
              type: next.type,
              status: 'planned' as const,
              result_note: '',
              is_next_step: true,
              due_at: next.due_at,
              created_at: nowIso(),
              completed_at: null,
            },
          ]
        }

        const companies = s.companies.map((c) => {
          if (c.id !== companyId) return c
          return {
            ...c,
            funnel_stage: nextStage(c.funnel_stage, meta.movesStageTo),
            last_activity_at: nowIso(),
          }
        })

        return { ...s, tasks, companies }
      })

    const addNextStep: StoreApi['addNextStep'] = (companyId, type, title, due_at) =>
      setState((s) => ({
        ...s,
        tasks: [
          ...s.tasks,
          {
            id: uid(),
            company_id: companyId,
            title: title || TASK_TYPE_META[type].label,
            description: '',
            type,
            status: 'planned' as const,
            result_note: '',
            is_next_step: true,
            due_at,
            created_at: nowIso(),
            completed_at: null,
          },
        ],
      }))

    const cancelTask = (taskId: string) =>
      setState((s) => ({
        ...s,
        tasks: s.tasks.map((t) => (t.id === taskId ? { ...t, status: 'cancelled' as const } : t)),
      }))

    const toggleSubtask = (subtaskId: string) =>
      setState((s) => ({
        ...s,
        hypSubtasks: s.hypSubtasks.map((sub) =>
          sub.id === subtaskId ? { ...sub, is_done: !sub.is_done } : sub,
        ),
      }))

    const addHypothesis = (title: string, description: string) =>
      setState((s) => ({
        ...s,
        hypotheses: [
          ...s.hypotheses,
          { id: uid(), strategy_id: s.strategy.id, title, description, is_active: true, created_at: nowIso() },
        ],
      }))

    const updateHypothesis = (id: string, patch: Partial<Hypothesis>) =>
      setState((s) => ({
        ...s,
        hypotheses: s.hypotheses.map((h) => (h.id === id ? { ...h, ...patch } : h)),
      }))

    const deleteHypothesis = (id: string) =>
      setState((s) => {
        const taskIds = s.hypTasks.filter((t) => t.hypothesis_id === id).map((t) => t.id)
        return {
          ...s,
          hypotheses: s.hypotheses.filter((h) => h.id !== id),
          hypTasks: s.hypTasks.filter((t) => t.hypothesis_id !== id),
          hypSubtasks: s.hypSubtasks.filter((sub) => !taskIds.includes(sub.hyp_task_id)),
        }
      })

    const reset = () => setState(initialState)

    return {
      state,
      reset,
      takeToWork,
      rejectSignal,
      excludeCompany,
      recordRevenue,
      completeTask,
      addNextStep,
      cancelTask,
      toggleSubtask,
      addHypothesis,
      updateHypothesis,
      deleteHypothesis,
    }
  }, [state])

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

export { openTaskFor }
