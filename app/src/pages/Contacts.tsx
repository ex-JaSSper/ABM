import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/store'
import { Panel } from '../components/ui'

export function Contacts() {
  const { state } = useStore()
  const [q, setQ] = useState('')
  const [companyId, setCompanyId] = useState<string>('all')

  const rows = useMemo(() => {
    return state.contacts.filter((k) => {
      if (companyId === 'unmatched' && k.company_id !== null) return false
      if (companyId !== 'all' && companyId !== 'unmatched' && k.company_id !== companyId) return false
      if (q && !`${k.full_name} ${k.position} ${k.company_name}`.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [state.contacts, q, companyId])

  const unmatched = state.contacts.filter((k) => k.company_id === null).length

  return (
    <div className="space-y-7">
      <header className="border-b border-line pb-5">
        <div className="eyebrow">Реестр ЛПР</div>
        <h1 className="display mt-1.5 text-3xl font-bold">Контакты</h1>
        <p className="mt-1 text-sm text-ink-2">
          <span className="readout text-brass">{state.contacts.length}</span> контактов
          {unmatched > 0 && <span className="text-signal"> · {unmatched} без матча</span>}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск по имени, должности…" className="field max-w-xs" />
        <select value={companyId} onChange={(e) => setCompanyId(e.target.value)} className="field w-auto">
          <option value="all">Все компании</option>
          {state.companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          {unmatched > 0 && <option value="unmatched">⚠ Без матча ({unmatched})</option>}
        </select>
      </div>

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="eyebrow border-b border-line text-left [&>th]:px-3 [&>th]:py-3 [&>th]:font-normal">
                <th className="!pl-5">Имя</th>
                <th>Должность</th>
                <th>Компания</th>
                <th>Контакты</th>
                <th>Источник</th>
                <th className="!pr-5">Уверенность</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((k) => (
                <tr key={k.id} className={`hover:bg-well/60 ${k.company_id === null ? 'bg-signal-wash/40' : ''}`}>
                  <td className="px-3 py-3 !pl-5 font-medium">{k.full_name}</td>
                  <td className="px-3 py-3 text-ink-2">{k.position || k.role_target}</td>
                  <td className="px-3 py-3">
                    {k.company_id ? (
                      <Link to={`/companies/${k.company_id}`} className="text-ink hover:text-brass">
                        {k.company_name}
                      </Link>
                    ) : (
                      <span className="text-signal">⚠ {k.company_name} (не найдена)</span>
                    )}
                  </td>
                  <td className="readout px-3 py-3 text-[0.7rem] text-ink-2">
                    <div className="flex flex-col">
                      {k.phone && <span>{k.phone}</span>}
                      {k.email && <span>{k.email}</span>}
                      {k.telegram && <span>{k.telegram}</span>}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-ink-2">{k.source}</td>
                  <td className="px-3 py-3 !pr-5 text-ink-2">{k.confidence}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="p-10 text-center text-sm text-ink-3">Ничего не найдено</div>}
        </div>
      </Panel>
    </div>
  )
}
