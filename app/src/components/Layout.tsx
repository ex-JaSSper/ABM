import { NavLink, Outlet } from 'react-router-dom'
import { useStore } from '../store/store'
import { computeFocus } from '../lib/engine'

const NAV = [
  { to: '/', label: 'Обзор', code: '00', end: true },
  { to: '/hypotheses', label: 'Гипотезы', code: '01' },
  { to: '/signals', label: 'Сигналы', code: '02' },
  { to: '/companies', label: 'Компании', code: '03' },
  { to: '/contacts', label: 'Контакты', code: '04' },
  { to: '/tasks', label: 'Задачи', code: '05' },
]

export function Layout() {
  const { state } = useStore()
  const signalsCount = state.companies.filter((c) => c.funnel_stage === 'new_signal').length
  const stalledCount = computeFocus(state).filter((f) => f.stalled).length
  const openTasks = state.tasks.filter((t) => t.status === 'planned' || t.status === 'waiting').length

  const badges: Record<string, number> = { '/signals': signalsCount, '/tasks': openTasks }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-60 shrink-0 flex-col bg-blueprint text-paper">
        {/* Отвес-логотип */}
        <div className="px-5 pt-6 pb-5">
          <div className="flex items-center gap-3">
            <PlumbMark />
            <div>
              <div className="display text-[1.05rem] font-bold leading-none tracking-tight">Отвес</div>
              <div className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-blueprint-3">
                ABM · движок
              </div>
            </div>
          </div>
        </div>

        <div className="mx-5 h-px bg-blueprint-2/60" />

        <nav className="flex-1 px-3 py-4">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-[3px] px-3 py-2.5 text-sm transition ${
                  isActive ? 'bg-blueprint-2/70 text-paper' : 'text-paper/60 hover:bg-blueprint-2/35 hover:text-paper'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full transition ${
                      isActive ? 'bg-brass' : 'bg-transparent'
                    }`}
                  />
                  <span className="font-mono text-[0.65rem] text-blueprint-3">{item.code}</span>
                  <span className="flex-1 font-medium">{item.label}</span>
                  {badges[item.to] ? (
                    <span className="rounded-[2px] bg-brass px-1.5 py-0.5 font-mono text-[0.65rem] font-semibold text-white">
                      {badges[item.to]}
                    </span>
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {stalledCount > 0 && (
          <div className="mx-3 mb-3 flex items-center gap-2.5 rounded-[3px] border border-signal/40 bg-signal/15 px-3 py-2.5">
            <span className="beacon shrink-0" />
            <span className="text-xs leading-tight text-paper/85">
              Зависших компаний: <b className="readout text-paper">{stalledCount}</b>
            </span>
          </div>
        )}

        <div className="border-t border-blueprint-2/60 px-5 py-3.5">
          <div className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-blueprint-3">Стратегия</div>
          <div className="mt-1 text-[0.8rem] leading-snug text-paper/80">
            {state.strategy.name}
          </div>
          <div className="readout mt-0.5 text-[0.72rem] text-brass-2">{state.strategy.quarter}</div>
        </div>
      </aside>

      <main className="drafting flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-10 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

// Латунный отвес: нить, гайка и грузик-бобышка
function PlumbMark() {
  return (
    <svg width="30" height="34" viewBox="0 0 30 34" fill="none" aria-hidden>
      <line x1="15" y1="1" x2="15" y2="14" stroke="#dfa640" strokeWidth="1.5" />
      <rect x="9" y="13" width="12" height="4" rx="1" fill="#b9822a" />
      <path d="M15 17 L22 24 Q15 34 8 24 Z" fill="#dfa640" stroke="#b9822a" strokeWidth="1" />
      <circle cx="15" cy="23" r="1.6" fill="#102b3c" />
    </svg>
  )
}
