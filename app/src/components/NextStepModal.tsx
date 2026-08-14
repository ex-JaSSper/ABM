import { useState } from 'react'
import type { CompanyTask, TaskType } from '../types'
import { NEXT_STEP_TYPES, TASK_TYPE_META } from '../lib/engine'
import { useStore } from '../store/store'
import { Label, Modal } from './ui'

// Завершение задачи: фиксируем результат, затем обязательный выбор —
// назначить следующий шаг ИЛИ исключить компанию (инвариант фокуса).
export function CompleteTaskModal({ task, onClose }: { task: CompanyTask; onClose: () => void }) {
  const { completeTask, excludeCompany } = useStore()
  const [resultNote, setResultNote] = useState('')
  const [mode, setMode] = useState<'next' | 'exclude'>('next')
  const [type, setType] = useState<TaskType>('touch_repeat')
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  const [excludeReason, setExcludeReason] = useState('')

  const submit = () => {
    if (mode === 'exclude') {
      completeTask(task.id, resultNote)
      excludeCompany(task.company_id, excludeReason || 'Без причины')
    } else {
      completeTask(task.id, resultNote, { type, title, due_at: due ? new Date(due).toISOString() : null })
    }
    onClose()
  }

  return (
    <Modal title="Завершить задачу" onClose={onClose}>
      <div className="space-y-5">
        <div>
          <Label>Результат</Label>
          <textarea
            value={resultNote}
            onChange={(e) => setResultNote(e.target.value)}
            placeholder="«Хорошо пообщались, запросили КП»…"
            className="field"
            rows={2}
          />
        </div>

        <div>
          <Label>Что дальше — обязательный выбор</Label>
          <div className="flex gap-1 rounded-[3px] border border-line bg-well p-1">
            <button
              onClick={() => setMode('next')}
              className={`flex-1 rounded-[2px] px-3 py-1.5 text-sm font-semibold transition ${
                mode === 'next' ? 'bg-card text-brass shadow-sm' : 'text-ink-3'
              }`}
            >
              Назначить шаг
            </button>
            <button
              onClick={() => setMode('exclude')}
              className={`flex-1 rounded-[2px] px-3 py-1.5 text-sm font-semibold transition ${
                mode === 'exclude' ? 'bg-card text-signal shadow-sm' : 'text-ink-3'
              }`}
            >
              Исключить компанию
            </button>
          </div>
        </div>

        {mode === 'next' ? (
          <div className="space-y-4">
            <div>
              <Label>Тип шага</Label>
              <select value={type} onChange={(e) => setType(e.target.value as TaskType)} className="field">
                {NEXT_STEP_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TASK_TYPE_META[t].label}
                    {TASK_TYPE_META[t].metric ? '  → +1 к метрике' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Заголовок</Label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={TASK_TYPE_META[type].label} className="field" />
              </div>
              <div>
                <Label>Дедлайн</Label>
                <input type="date" value={due} onChange={(e) => setDue(e.target.value)} className="field" />
              </div>
            </div>
          </div>
        ) : (
          <div>
            <Label>Причина исключения</Label>
            <input value={excludeReason} onChange={(e) => setExcludeReason(e.target.value)} placeholder="Не наш профиль / нет бюджета…" className="field" />
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button onClick={onClose} className="btn btn-ghost">Отмена</button>
          <button onClick={submit} className={`btn ${mode === 'exclude' ? 'btn-signal' : 'btn-brass'}`}>
            {mode === 'exclude' ? 'Завершить и исключить' : 'Завершить и назначить шаг'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
