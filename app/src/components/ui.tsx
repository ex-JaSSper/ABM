import type { ReactNode } from 'react'
import { useEffect } from 'react'
import type { FunnelStage, TaskStatus } from '../types'
import { STAGE_LABEL } from '../lib/engine'

// Стадии воронки — тёплая шкала (живой процесс), teal только для терминалов измерения.
const STAGE_COLORS: Record<FunnelStage, string> = {
  new_signal: 'bg-well text-ink-2 border-line-2',
  rejected: 'bg-signal-wash text-signal border-signal/30',
  in_work: 'bg-blueprint/8 text-blueprint border-blueprint/20',
  touched: 'bg-brass-wash text-brass border-brass/30',
  met: 'bg-brass/15 text-brass border-brass/40',
  agreement: 'bg-brass text-white border-brass',
  revenue: 'bg-moss text-white border-moss',
  excluded: 'bg-ink/8 text-ink-3 border-line-2',
}

export function StageBadge({ stage }: { stage: FunnelStage }) {
  return <span className={`chip ${STAGE_COLORS[stage]}`}>{STAGE_LABEL[stage]}</span>
}

const PRIORITY_COLORS: Record<string, string> = {
  A: 'bg-signal text-white',
  B: 'bg-brass text-white',
  C: 'bg-well text-ink-2 border border-line-2',
}

export function PriorityBadge({ p }: { p: string }) {
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-[2px] font-mono text-[0.7rem] font-semibold ${
        PRIORITY_COLORS[p] ?? 'bg-well text-ink-2'
      }`}
    >
      {p}
    </span>
  )
}

const STATUS_META: Record<TaskStatus, { label: string; cls: string }> = {
  planned: { label: 'Запланирована', cls: 'bg-blueprint/8 text-blueprint border-blueprint/20' },
  waiting: { label: 'Ждёт ответа', cls: 'bg-brass-wash text-brass border-brass/30' },
  done: { label: 'Завершена', cls: 'bg-moss-wash text-moss border-moss/30' },
  cancelled: { label: 'Отменена', cls: 'bg-ink/8 text-ink-3 border-line-2' },
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  const m = STATUS_META[status]
  return <span className={`chip ${m.cls}`}>{m.label}</span>
}

export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`panel ${className}`}>{children}</div>
}

export function PanelHead({ title, right }: { title: ReactNode; right?: ReactNode }) {
  return (
    <div className="panel-head">
      <h2 className="panel-title">{title}</h2>
      {right}
    </div>
  )
}

// Прогресс — «плоскость измерения», холодная teal-шкала
export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  const pct = Math.round(value * 100)
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-well ${className}`}>
      <div className="h-full rounded-full bg-teal transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blueprint/45 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <div className="panel w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between border-b border-line pb-3">
          <h3 className="display text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="text-ink-3 transition hover:text-ink" aria-label="Закрыть">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="p-10 text-center text-sm text-ink-3">{children}</div>
}

export function Label({ children }: { children: ReactNode }) {
  return <label className="mb-1.5 block eyebrow">{children}</label>
}
