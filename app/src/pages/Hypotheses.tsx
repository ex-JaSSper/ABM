import { useState } from 'react'
import { useStore } from '../store/store'
import { hypothesisProgress, taskProgress } from '../lib/engine'
import { Panel, Modal, Label } from '../components/ui'

export function Hypotheses() {
  const { state, toggleSubtask, addHypothesis, updateHypothesis, deleteHypothesis } = useStore()
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="space-y-7">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="eyebrow text-teal">Плоскость измерения · отдельно от воронки</div>
          <h1 className="display mt-1.5 text-3xl font-bold">Стратегия и гипотезы</h1>
          <p className="mt-1 text-sm text-ink-2">
            {state.strategy.name} · <span className="readout text-teal">{state.strategy.quarter}</span>
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} className="btn btn-brass">
          + Гипотеза
        </button>
      </header>

      <div className="space-y-5">
        {state.hypotheses.map((h) => {
          const progress = hypothesisProgress(state, h)
          const tasks = state.hypTasks.filter((t) => t.hypothesis_id === h.id)
          return (
            <Panel key={h.id} className="overflow-hidden">
              {/* холодная риска слева — маркер «плоскости измерения» */}
              <div className="border-l-[3px] border-teal p-5">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="display font-semibold">{h.title}</h3>
                      {!h.is_active && <span className="chip border-line-2 bg-well text-ink-3">неактивна</span>}
                    </div>
                    <p className="mt-1 text-sm text-ink-2">{h.description}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="readout text-2xl font-semibold text-teal">{Math.round(progress * 100)}%</span>
                    <button onClick={() => updateHypothesis(h.id, { is_active: !h.is_active })} className="btn btn-ghost btn-sm">
                      {h.is_active ? 'В архив' : 'Активировать'}
                    </button>
                    <button onClick={() => deleteHypothesis(h.id)} className="btn btn-ghost btn-sm !text-signal">
                      Удалить
                    </button>
                  </div>
                </div>

                <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-well">
                  <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>

                <div className="space-y-3">
                  {tasks.map((t) => {
                    const tp = taskProgress(state, t.id)
                    const subs = state.hypSubtasks
                      .filter((s) => s.hyp_task_id === t.id)
                      .sort((a, b) => a.sort_order - b.sort_order)
                    return (
                      <div key={t.id} className="rounded-[3px] border border-line bg-well/50 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium">{t.title}</span>
                          <span className="readout text-xs text-ink-3">
                            {subs.filter((s) => s.is_done).length}/{subs.length} · {Math.round(tp * 100)}%
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {subs.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => toggleSubtask(s.id)}
                              className={`inline-flex items-center gap-1 rounded-[2px] px-2 py-1 text-xs transition ${
                                s.is_done
                                  ? 'bg-teal text-white'
                                  : 'border border-line-2 bg-card text-ink-2 hover:border-teal'
                              }`}
                            >
                              <span>{s.is_done ? '☑' : '☐'}</span>
                              {s.title}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {tasks.length === 0 && <p className="text-sm text-ink-3">Задач по гипотезе нет.</p>}
                </div>
              </div>
            </Panel>
          )
        })}
      </div>

      {showAdd && (
        <AddHypothesisModal
          onClose={() => setShowAdd(false)}
          onSubmit={(title, desc) => {
            addHypothesis(title, desc)
            setShowAdd(false)
          }}
        />
      )}
    </div>
  )
}

function AddHypothesisModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (title: string, desc: string) => void
}) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  return (
    <Modal title="Новая гипотеза" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <Label>Формулировка (измеримо)</Label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="«Продукт X понравится сегменту Y»" className="field" />
        </div>
        <div>
          <Label>Описание</Label>
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} className="field" />
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button onClick={onClose} className="btn btn-ghost">Отмена</button>
          <button onClick={() => title && onSubmit(title, desc)} className="btn btn-brass">Создать</button>
        </div>
      </div>
    </Modal>
  )
}
