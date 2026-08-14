import { Link } from 'react-router-dom'
import { useStore } from '../store/store'
import { Panel, PriorityBadge } from '../components/ui'

export function Signals() {
  const { state, takeToWork, rejectSignal } = useStore()
  const signals = state.companies.filter((c) => c.funnel_stage === 'new_signal')

  return (
    <div className="space-y-7">
      <header className="border-b border-line pb-5">
        <div className="eyebrow">Первичный отвес</div>
        <h1 className="display mt-1.5 text-3xl font-bold">Сигналы</h1>
        <p className="mt-1 text-sm text-ink-2">
          Очередь новых компаний · <span className="readout text-brass">{signals.length}</span> ждут решения
        </p>
      </header>

      {signals.length === 0 ? (
        <Panel>
          <div className="p-12 text-center text-sm text-ink-3">Очередь пуста — все сигналы разобраны.</div>
        </Panel>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {signals.map((c) => (
            <Panel key={c.id} className="flex flex-col p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <PriorityBadge p={c.priority} />
                  <Link to={`/companies/${c.id}`} className="display font-semibold hover:text-brass">
                    {c.name}
                  </Link>
                </div>
                <span className="readout text-[0.72rem] text-ink-3">
                  {c.segment} · {c.geography}
                </span>
              </div>

              <dl className="mb-5 space-y-2.5 text-sm">
                <Field label="Почему подходит" value={c.why_fit} />
                <Field label="Сигнал / наблюдение" value={c.signal_note} />
                {c.who_to_find && <Field label="Кого искать" value={c.who_to_find} />}
              </dl>

              <div className="mt-auto flex gap-2 border-t border-line pt-4">
                <button onClick={() => takeToWork(c.id)} className="btn btn-primary flex-1 justify-center">
                  В работу →
                </button>
                <button onClick={() => rejectSignal(c.id)} className="btn btn-ghost">
                  Не подходит
                </button>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-0.5 text-ink">{value}</dd>
    </div>
  )
}
