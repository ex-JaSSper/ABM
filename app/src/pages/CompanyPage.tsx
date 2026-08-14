import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore } from '../store/store'
import { fmtDate, fmtMoney, openTaskFor, NEXT_STEP_TYPES, TASK_TYPE_META } from '../lib/engine'
import { Panel, PanelHead, PriorityBadge, StageBadge, StatusBadge, Modal, Label } from '../components/ui'
import { CompleteTaskModal } from '../components/NextStepModal'
import type { TaskType } from '../types'

export function CompanyPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { state, addNextStep, recordRevenue, excludeCompany } = useStore()
  const company = state.companies.find((c) => c.id === id)
  const [completingId, setCompletingId] = useState<string | null>(null)
  const [showNextStep, setShowNextStep] = useState(false)
  const [showRevenue, setShowRevenue] = useState(false)
  const [showExclude, setShowExclude] = useState(false)

  if (!company) {
    return (
      <div className="space-y-4">
        <p>Компания не найдена.</p>
        <Link to="/companies" className="text-brass hover:underline">
          ← К списку компаний
        </Link>
      </div>
    )
  }

  const contacts = state.contacts.filter((c) => c.company_id === company.id)
  const tasks = state.tasks
    .filter((t) => t.company_id === company.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const openTask = openTaskFor(state, company.id)
  const completing = state.tasks.find((t) => t.id === completingId) ?? null
  const isTerminal = ['rejected', 'excluded', 'revenue'].includes(company.funnel_stage)

  const fields: [string, string][] = [
    ['Почему подходит', company.why_fit],
    ['Сигнал / наблюдение', company.signal_note],
    ['Релевантная гипотеза', company.relevant_hypothesis_text],
    ['Что проверить / предложить', company.what_to_check],
    ['Кого искать для входа', company.who_to_find],
    ['Расширенный повод', company.extended_reason],
    ['Заготовка 1-го сообщения', company.first_message_template],
    ['Заготовка 2-го сообщения', company.second_message_template],
  ]

  return (
    <div className="space-y-7">
      <Link to="/companies" className="eyebrow hover:text-brass">
        ← Компании
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-3">
            <PriorityBadge p={company.priority} />
            <h1 className="display text-2xl font-bold">{company.name}</h1>
            <StageBadge stage={company.funnel_stage} />
          </div>
          <p className="readout mt-1.5 text-[0.78rem] text-ink-3">
            № {company.ext_no} · {company.segment} · {company.category} · {company.geography}
          </p>
          {company.funnel_stage === 'revenue' && (
            <p className="mt-1 text-sm font-semibold text-moss">Выручка: {fmtMoney(company.revenue_amount)}</p>
          )}
          {company.funnel_stage === 'excluded' && (
            <p className="mt-1 text-sm text-ink-2">Исключена: {company.excluded_reason || '—'}</p>
          )}
        </div>

        {!isTerminal && (
          <div className="flex flex-wrap gap-2">
            {openTask ? (
              <button onClick={() => setCompletingId(openTask.id)} className="btn btn-primary">
                Завершить: {openTask.title}
              </button>
            ) : (
              <button onClick={() => setShowNextStep(true)} className="btn btn-brass">
                + Назначить следующий шаг
              </button>
            )}
            {company.funnel_stage === 'agreement' && (
              <button onClick={() => setShowRevenue(true)} className="btn btn-moss">
                Зафиксировать выручку
              </button>
            )}
            <button onClick={() => setShowExclude(true)} className="btn btn-ghost">
              Исключить
            </button>
          </div>
        )}
      </div>

      {!isTerminal && !openTask && (
        <div className="flex items-center gap-3 rounded-[4px] border border-signal/30 bg-signal-wash px-4 py-3 text-sm text-signal">
          <span className="beacon shrink-0" />
          Активная компания без открытого шага — она «зависла» и попадает в «Фокус». Назначьте следующий шаг.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel className="lg:col-span-2">
          <PanelHead title="Досье" />
          <dl className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
            {fields.map(([label, value]) => (
              <div key={label}>
                <dt className="eyebrow">{label}</dt>
                <dd className="mt-1 text-sm text-ink">{value || '—'}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel>
          <PanelHead title="Контакты (ЛПР)" right={<span className="readout text-xs text-ink-3">{contacts.length}</span>} />
          <div className="divide-y divide-line">
            {contacts.length === 0 && <div className="p-5 text-sm text-ink-3">Нет контактов</div>}
            {contacts.map((k) => (
              <div key={k.id} className="px-5 py-3.5">
                <div className="font-medium">{k.full_name}</div>
                <div className="text-xs text-ink-2">{k.position || k.role_target}</div>
                <div className="readout mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[0.7rem] text-ink-3">
                  {k.phone && <span>{k.phone}</span>}
                  {k.email && <span>{k.email}</span>}
                  {k.telegram && <span>{k.telegram}</span>}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHead title="История задач" />
        <div className="divide-y divide-line">
          {tasks.length === 0 && <div className="p-5 text-sm text-ink-3">Задач ещё нет</div>}
          {tasks.map((t) => (
            <div key={t.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{t.title}</span>
                  <span className="chip border-line-2 bg-well text-ink-2">{TASK_TYPE_META[t.type].label}</span>
                  <StatusBadge status={t.status} />
                </div>
                {t.result_note && <div className="mt-0.5 text-xs text-ink-2">↳ {t.result_note}</div>}
                <div className="readout mt-0.5 text-[0.7rem] text-ink-3">
                  Создана {fmtDate(t.created_at)}
                  {t.due_at && ` · дедлайн ${fmtDate(t.due_at)}`}
                  {t.completed_at && ` · завершена ${fmtDate(t.completed_at)}`}
                </div>
              </div>
              {(t.status === 'planned' || t.status === 'waiting') && (
                <button onClick={() => setCompletingId(t.id)} className="btn btn-primary btn-sm shrink-0">
                  Завершить
                </button>
              )}
            </div>
          ))}
        </div>
      </Panel>

      {completing && <CompleteTaskModal task={completing} onClose={() => setCompletingId(null)} />}
      {showNextStep && (
        <AddNextStepModal
          onClose={() => setShowNextStep(false)}
          onSubmit={(type, title, due) => {
            addNextStep(company.id, type, title, due)
            setShowNextStep(false)
          }}
        />
      )}
      {showRevenue && (
        <RevenueModal
          onClose={() => setShowRevenue(false)}
          onSubmit={(amount) => {
            recordRevenue(company.id, amount)
            setShowRevenue(false)
          }}
        />
      )}
      {showExclude && (
        <ExcludeModal
          onClose={() => setShowExclude(false)}
          onSubmit={(reason) => {
            excludeCompany(company.id, reason)
            setShowExclude(false)
            navigate('/companies')
          }}
        />
      )}
    </div>
  )
}

function AddNextStepModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (type: TaskType, title: string, due: string | null) => void
}) {
  const [type, setType] = useState<TaskType>('touch_new')
  const [title, setTitle] = useState('')
  const [due, setDue] = useState('')
  return (
    <Modal title="Назначить следующий шаг" onClose={onClose}>
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
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button onClick={onClose} className="btn btn-ghost">Отмена</button>
          <button onClick={() => onSubmit(type, title, due ? new Date(due).toISOString() : null)} className="btn btn-brass">
            Создать шаг
          </button>
        </div>
      </div>
    </Modal>
  )
}

function RevenueModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (amount: number) => void }) {
  const [amount, setAmount] = useState('')
  return (
    <Modal title="Зафиксировать выручку" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-ink-2">Оплата переводит компанию в стадию «Выручка».</p>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Сумма, руб." className="field" />
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button onClick={onClose} className="btn btn-ghost">Отмена</button>
          <button onClick={() => onSubmit(Number(amount) || 0)} className="btn btn-moss">Зафиксировать</button>
        </div>
      </div>
    </Modal>
  )
}

function ExcludeModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState('')
  return (
    <Modal title="Исключить компанию" onClose={onClose}>
      <div className="space-y-4">
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Причина исключения" className="field" />
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <button onClick={onClose} className="btn btn-ghost">Отмена</button>
          <button onClick={() => onSubmit(reason)} className="btn btn-signal">Исключить</button>
        </div>
      </div>
    </Modal>
  )
}
