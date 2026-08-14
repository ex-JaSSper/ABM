import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/store'
import {
  computeFocus,
  computeFunnel,
  computeKpiRows,
  computeMetrics,
  fmtMoney,
  fmtNum,
  hypothesisProgress,
} from '../lib/engine'
import { Panel, PanelHead, ProgressBar, StageBadge } from '../components/ui'
import { CompleteTaskModal } from '../components/NextStepModal'
import type { CompanyTask } from '../types'

export function Dashboard() {
  const { state } = useStore()
  const navigate = useNavigate()
  const kpi = computeKpiRows(state)
  const funnel = computeFunnel(state)
  const metrics = computeMetrics(state)
  const focus = computeFocus(state)
  const [completing, setCompleting] = useState<CompanyTask | null>(null)

  const signals = state.companies.filter((c) => c.funnel_stage === 'new_signal').length
  const processed = state.companies.length - signals
  const stalled = focus.filter((f) => f.stalled).length
  const openTasks = state.tasks.filter((t) => t.status === 'planned' || t.status === 'waiting').length

  return (
    <div className="space-y-8">
      {/* Заголовок как шапка прибора */}
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="eyebrow">Пульт оператора</div>
          <h1 className="display mt-1.5 text-3xl font-bold">Обзор</h1>
        </div>
        <div className="text-right">
          <div className="text-sm text-ink-2">{state.strategy.name}</div>
          <div className="readout text-brass">{state.strategy.quarter}</div>
        </div>
      </header>

      {/* Приборные показания */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Gauge label="Сигналы" value={`${processed}·${signals}`} note="разобрано · ждут" onClick={() => navigate('/signals')} />
        <Gauge label="Новых касаний" value={fmtNum(metrics.new_touches)} note="записано" tone="brass" />
        <Gauge label="Открытых шагов" value={fmtNum(openTasks)} note="в работе" onClick={() => navigate('/tasks')} />
        <Gauge label="Зависших" value={fmtNum(stalled)} note="без хода / просрочка" tone={stalled > 0 ? 'signal' : 'muted'} alarm={stalled > 0} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* KPI — план/факт как таблица показаний */}
        <Panel className="xl:col-span-2">
          <PanelHead title={<>KPI · план / факт</>} right={<span className="eyebrow">{state.strategy.quarter}</span>} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="eyebrow text-left [&>th]:px-3 [&>th]:py-2 [&>th]:font-normal">
                  <th className="!pl-5">KPI</th>
                  <th>Ед.</th>
                  <th className="text-right">План</th>
                  <th className="text-right">Факт</th>
                  <th className="text-right">Вып.</th>
                  <th className="text-right">ΔQ</th>
                  <th className="!pr-5 text-right">Пред. Q</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {kpi.map((r) => {
                  const isMoney = r.unit === 'руб.'
                  const f = (n: number) => (isMoney ? fmtMoney(n) : fmtNum(n))
                  return (
                    <tr key={r.kpi_key} className="hover:bg-well/60">
                      <td className="px-3 py-2.5 !pl-5 font-medium">{r.label}</td>
                      <td className="px-3 py-2.5 text-ink-3">{r.unit}</td>
                      <td className="readout px-3 py-2.5 text-right text-ink-2">{f(r.plan)}</td>
                      <td className="readout px-3 py-2.5 text-right font-semibold">{f(r.fact)}</td>
                      <td className="px-3 py-2.5 text-right">
                        <CompletionMark pct={r.completion} />
                      </td>
                      <td className={`readout px-3 py-2.5 text-right ${r.delta >= 0 ? 'text-moss' : 'text-signal'}`}>
                        {r.delta >= 0 ? '+' : ''}
                        {f(r.delta)}
                      </td>
                      <td className="readout px-3 py-2.5 !pr-5 text-right text-ink-3">{f(r.prevQ)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        {/* Метрики-счётчики */}
        <Panel>
          <PanelHead title="Метрики" right={<span className="eyebrow">с повторами</span>} />
          <div className="grid grid-cols-2 gap-px bg-line">
            <MetricCell label="Новые касания" value={metrics.new_touches} />
            <MetricCell label="Повт. касания" value={metrics.repeat_touches} />
            <MetricCell label="Новые встречи" value={metrics.new_meetings} />
            <MetricCell label="Повт. встречи" value={metrics.repeat_meetings} />
            <MetricCell label="Договорённости" value={metrics.agreements} />
            <MetricCell label="Выручка" value={metrics.revenue} money />
          </div>
        </Panel>
      </div>

      {/* Воронка — сужающаяся форма */}
      <Panel>
        <PanelHead title="Воронка" right={<span className="eyebrow">уникальные клиенты</span>} />
        <div className="space-y-2.5 p-5">
          {funnel.map((b, i) => {
            const max = funnel[0].value || 1
            const widthPct = Math.max(20, Math.round((b.value / max) * 100))
            const colors = ['#2b5f80', '#356f7a', '#9c7431', '#b9822a', '#567a34']
            return (
              <div key={b.key} className="flex items-center gap-4">
                <div className="w-32 shrink-0 text-right">
                  <div className="text-sm font-medium">{b.label}</div>
                </div>
                <div className="flex flex-1 justify-center">
                  <div
                    className="flex h-11 items-center rounded-[3px] px-4 text-white transition-all"
                    style={{ width: `${widthPct}%`, background: colors[i], justifyContent: widthPct >= 42 ? 'space-between' : 'center' }}
                  >
                    {widthPct >= 42 && (
                      <span className="font-mono text-[0.7rem] uppercase tracking-wider text-white/70">{b.key}</span>
                    )}
                    <span className="readout text-lg font-semibold">{b.value}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* СИГНАТУРА: Фокус как отвес */}
        <Panel>
          <PanelHead
            title={<>Фокус · с кем работать сейчас</>}
            right={<span className="eyebrow">{focus.length} активных</span>}
          />
          {focus.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-3">Нет активных компаний</div>
          ) : (
            <div className="relative py-2 pl-5 pr-5">
              {/* нить отвеса */}
              <div className="absolute bottom-8 left-[26px] top-4 w-px bg-brass/50" />
              <div className="space-y-1">
                {focus.map((f) => (
                  <div key={f.company.id} className="relative flex items-center gap-3 rounded-[3px] py-2.5 pl-6 pr-1 hover:bg-well/60">
                    {/* узел на нити */}
                    <span className="absolute left-[4px] top-1/2 -translate-y-1/2">
                      {f.stalled ? <span className="beacon" /> : <span className="block h-2 w-2 rounded-full bg-brass" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link to={`/companies/${f.company.id}`} className="truncate font-medium hover:text-brass">
                          {f.company.name}
                        </Link>
                        <StageBadge stage={f.company.funnel_stage} />
                        {f.stalled && (
                          <span className="chip border-signal/30 bg-signal-wash text-signal">
                            {f.overdue ? 'просрочка' : 'завис'}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 truncate text-xs text-ink-3">
                        {f.openTask ? `Шаг: ${f.openTask.title}` : 'Нет открытого шага'}
                        <span className="readout"> · простой {f.idleDays}д</span>
                      </div>
                    </div>
                    {f.openTask ? (
                      <button onClick={() => setCompleting(f.openTask!)} className="btn btn-primary btn-sm shrink-0">
                        Завершить
                      </button>
                    ) : (
                      <Link to={`/companies/${f.company.id}`} className="btn btn-brass btn-sm shrink-0">
                        Назначить шаг
                      </Link>
                    )}
                  </div>
                ))}
              </div>
              {/* грузик отвеса */}
              <div className="absolute bottom-2 left-[20px]">
                <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden>
                  <path d="M7 0 L13 7 Q7 16 1 7 Z" fill="#b9822a" />
                </svg>
              </div>
            </div>
          )}
        </Panel>

        {/* Гипотезы — холодная плоскость измерения */}
        <Panel>
          <PanelHead
            title={<>Гипотезы · плоскость измерения</>}
            right={
              <Link to="/hypotheses" className="eyebrow text-teal hover:underline">
                все →
              </Link>
            }
          />
          <div className="space-y-4 p-5">
            {state.hypotheses.map((h) => {
              const p = hypothesisProgress(state, h)
              return (
                <div key={h.id}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">{h.title}</span>
                    <span className="readout shrink-0 text-sm font-semibold text-teal">{Math.round(p * 100)}%</span>
                  </div>
                  <ProgressBar value={p} />
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      {completing && <CompleteTaskModal task={completing} onClose={() => setCompleting(null)} />}
    </div>
  )
}

function Gauge({
  label,
  value,
  note,
  tone = 'ink',
  alarm,
  onClick,
}: {
  label: string
  value: string
  note: string
  tone?: 'ink' | 'brass' | 'signal' | 'muted'
  alarm?: boolean
  onClick?: () => void
}) {
  const toneCls: Record<string, string> = {
    ink: 'text-ink',
    brass: 'text-brass',
    signal: 'text-signal',
    muted: 'text-ink-3',
  }
  return (
    <div
      onClick={onClick}
      className={`panel px-4 py-3.5 ${onClick ? 'cursor-pointer transition hover:-translate-y-0.5' : ''}`}
    >
      <div className="flex items-center gap-1.5">
        {alarm && <span className="beacon" />}
        <span className="eyebrow">{label}</span>
      </div>
      <div className={`readout mt-1.5 text-[1.7rem] font-semibold leading-none ${toneCls[tone]}`}>{value}</div>
      <div className="mt-1 text-[0.7rem] text-ink-3">{note}</div>
    </div>
  )
}

function CompletionMark({ pct }: { pct: number }) {
  const tone = pct >= 100 ? 'text-moss' : pct >= 50 ? 'text-brass' : 'text-signal'
  const bar = pct >= 100 ? 'bg-moss' : pct >= 50 ? 'bg-brass' : 'bg-signal'
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-1 w-10 overflow-hidden rounded-full bg-well">
        <span className={`block h-full ${bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </span>
      <span className={`readout text-xs font-semibold ${tone}`}>{pct}%</span>
    </span>
  )
}

function MetricCell({ label, value, money }: { label: string; value: number; money?: boolean }) {
  return (
    <div className="bg-card px-4 py-3.5">
      <div className="readout text-xl font-semibold">{money ? fmtMoney(value) : fmtNum(value)}</div>
      <div className="mt-0.5 text-[0.72rem] text-ink-3">{label}</div>
    </div>
  )
}
