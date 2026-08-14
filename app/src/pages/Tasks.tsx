import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/store'
import { fmtDate, TASK_TYPE_META } from '../lib/engine'
import { Panel, StatusBadge } from '../components/ui'
import { CompleteTaskModal } from '../components/NextStepModal'
import type { TaskStatus, TaskType } from '../types'

export function Tasks() {
  const { state } = useStore()
  const [status, setStatus] = useState<TaskStatus | 'all' | 'open'>('open')
  const [type, setType] = useState<TaskType | 'all'>('all')
  const [companyId, setCompanyId] = useState<string>('all')
  const [completingId, setCompletingId] = useState<string | null>(null)

  const now = Date.now()
  const companyName = (id: string) => state.companies.find((c) => c.id === id)?.name ?? '—'

  const rows = useMemo(() => {
    return state.tasks
      .filter((t) => {
        if (status === 'open' && !(t.status === 'planned' || t.status === 'waiting')) return false
        if (status !== 'all' && status !== 'open' && t.status !== status) return false
        if (type !== 'all' && t.type !== type) return false
        if (companyId !== 'all' && t.company_id !== companyId) return false
        return true
      })
      .sort((a, b) => {
        const ao = a.status === 'planned' || a.status === 'waiting' ? 0 : 1
        const bo = b.status === 'planned' || b.status === 'waiting' ? 0 : 1
        if (ao !== bo) return ao - bo
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
  }, [state.tasks, status, type, companyId])

  const completing = state.tasks.find((t) => t.id === completingId) ?? null

  return (
    <div className="space-y-7">
      <header className="border-b border-line pb-5">
        <div className="eyebrow">Трекер</div>
        <h1 className="display mt-1.5 text-3xl font-bold">Задачи</h1>
        <p className="mt-1 text-sm text-ink-2">Все задачи по компаниям · открытые шаги и просрочки</p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus | 'all' | 'open')} className="field w-auto">
          <option value="open">Открытые</option>
          <option value="all">Все статусы</option>
          <option value="planned">Запланированные</option>
          <option value="waiting">Ждут ответа</option>
          <option value="done">Завершённые</option>
          <option value="cancelled">Отменённые</option>
        </select>
        <select value={type} onChange={(e) => setType(e.target.value as TaskType | 'all')} className="field w-auto">
          <option value="all">Все типы</option>
          {(Object.keys(TASK_TYPE_META) as TaskType[]).map((t) => (
            <option key={t} value={t}>
              {TASK_TYPE_META[t].label}
            </option>
          ))}
        </select>
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="field w-auto">
          <option value="all">Все компании</option>
          {state.companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="eyebrow border-b border-line text-left [&>th]:px-3 [&>th]:py-3 [&>th]:font-normal">
                <th className="!pl-5">Задача</th>
                <th>Тип</th>
                <th>Компания</th>
                <th>Статус</th>
                <th>Дедлайн</th>
                <th className="!pr-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((t) => {
                const overdue =
                  t.due_at && (t.status === 'planned' || t.status === 'waiting') && new Date(t.due_at).getTime() < now
                return (
                  <tr key={t.id} className="hover:bg-well/60">
                    <td className="px-3 py-3 !pl-5">
                      <span className="font-medium">{t.title}</span>
                      {t.is_next_step && <span className="eyebrow ml-2 text-brass">шаг</span>}
                    </td>
                    <td className="px-3 py-3 text-ink-2">{TASK_TYPE_META[t.type].label}</td>
                    <td className="px-3 py-3">
                      <Link to={`/companies/${t.company_id}`} className="text-ink hover:text-brass">
                        {companyName(t.company_id)}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                    <td className={`readout px-3 py-3 text-xs ${overdue ? 'font-semibold text-signal' : 'text-ink-2'}`}>
                      {overdue ? '⚠ ' : ''}
                      {fmtDate(t.due_at)}
                    </td>
                    <td className="px-3 py-3 !pr-5 text-right">
                      {(t.status === 'planned' || t.status === 'waiting') && (
                        <button onClick={() => setCompletingId(t.id)} className="btn btn-primary btn-sm">
                          Завершить
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 && <div className="p-10 text-center text-sm text-ink-3">Нет задач по фильтру</div>}
        </div>
      </Panel>

      {completing && <CompleteTaskModal task={completing} onClose={() => setCompletingId(null)} />}
    </div>
  )
}
