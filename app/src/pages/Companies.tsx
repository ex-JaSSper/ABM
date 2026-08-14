import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/store'
import { openTaskFor, STAGE_LABEL } from '../lib/engine'
import { Panel, PriorityBadge, StageBadge } from '../components/ui'
import type { FunnelStage } from '../types'

const STAGES: (FunnelStage | 'all')[] = [
  'all', 'new_signal', 'in_work', 'touched', 'met', 'agreement', 'revenue', 'rejected', 'excluded',
]

export function Companies() {
  const { state } = useStore()
  const [q, setQ] = useState('')
  const [stage, setStage] = useState<FunnelStage | 'all'>('all')
  const [priority, setPriority] = useState<string>('all')

  const rows = useMemo(() => {
    return state.companies.filter((c) => {
      if (stage !== 'all' && c.funnel_stage !== stage) return false
      if (priority !== 'all' && c.priority !== priority) return false
      if (q && !`${c.name} ${c.segment} ${c.geography}`.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [state.companies, q, stage, priority])

  return (
    <div className="space-y-7">
      <header className="border-b border-line pb-5">
        <div className="eyebrow">Реестр</div>
        <h1 className="display mt-1.5 text-3xl font-bold">Компании</h1>
        <p className="mt-1 text-sm text-ink-2">
          <span className="readout text-brass">{state.companies.length}</span> компаний · каждая = страница
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по названию, сегменту, гео…"
          className="field max-w-xs"
        />
        <select value={stage} onChange={(e) => setStage(e.target.value as FunnelStage | 'all')} className="field w-auto">
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'Все стадии' : STAGE_LABEL[s]}
            </option>
          ))}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="field w-auto">
          <option value="all">Все приоритеты</option>
          <option value="A">A</option>
          <option value="B">B</option>
          <option value="C">C</option>
        </select>
      </div>

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="eyebrow border-b border-line text-left [&>th]:px-3 [&>th]:py-3 [&>th]:font-normal">
                <th className="!pl-5">№</th>
                <th>Приор.</th>
                <th>Компания</th>
                <th>Сегмент</th>
                <th>Гео</th>
                <th>Стадия</th>
                <th className="!pr-5">Открытый шаг</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((c) => {
                const open = openTaskFor(state, c.id)
                const active = ['in_work', 'touched', 'met', 'agreement'].includes(c.funnel_stage)
                return (
                  <tr key={c.id} className="hover:bg-well/60">
                    <td className="readout px-3 py-3 !pl-5 text-ink-3">{c.ext_no}</td>
                    <td className="px-3 py-3">
                      <PriorityBadge p={c.priority} />
                    </td>
                    <td className="px-3 py-3">
                      <Link to={`/companies/${c.id}`} className="font-medium hover:text-brass">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-ink-2">{c.segment}</td>
                    <td className="px-3 py-3 text-ink-2">{c.geography}</td>
                    <td className="px-3 py-3">
                      <StageBadge stage={c.funnel_stage} />
                    </td>
                    <td className="px-3 py-3 !pr-5 text-ink-2">
                      {open ? open.title : active ? <span className="text-signal">— завис</span> : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 && <div className="p-10 text-center text-sm text-ink-3">Ничего не найдено</div>}
        </div>
      </Panel>
    </div>
  )
}
