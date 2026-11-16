import { Search as SearchIcon, SearchX, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useLang, useT } from '../../lib/i18n'
import { goBack, navigate } from '../../lib/router'
import { useStore } from '../../store/store'
import { CATEGORIES, type CategoryId } from '../../store/types'
import { habitIcon } from '../../ui/icons'
import { Chip, Empty, SectionHead, tint } from '../../ui/kit'
import { TaskRow } from '../day/TaskRow'
import { scheduleText } from '../habits/Habits'

type Scope = 'all' | 'habits' | 'tasks' | 'goals'

export function Search() {
  const t = useT()
  const lang = useLang()
  const habits = useStore((s) => s.habits)
  const tasks = useStore((s) => s.tasks)
  const goals = useStore((s) => s.goals)
  const weekStart = useStore((s) => s.settings.weekStart)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('all')
  const [category, setCategory] = useState<CategoryId | 'all'>('all')
  const q = query.trim().toLowerCase()

  const found = useMemo(() => {
    const match = (...fields: string[]) => fields.some((f) => f.toLowerCase().includes(q))
    const cat = (c: CategoryId) => category === 'all' || c === category
    const active = q.length > 0 || category !== 'all'
    return {
      active,
      habits: active && scope !== 'tasks' && scope !== 'goals' ? habits.filter((h) => cat(h.category) && match(h.name, h.description, t.cat[h.category])) : [],
      tasks: active && scope !== 'habits' && scope !== 'goals' ? tasks.filter((x) => cat(x.category) && match(x.title, x.notes)).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 50) : [],
      goals: active && scope !== 'habits' && scope !== 'tasks' && category === 'all' ? goals.filter((g) => match(g.title, g.description, ...g.milestones.map((m) => m.title))) : [],
    }
  }, [q, scope, category, habits, tasks, goals, t])
  const total = found.habits.length + found.tasks.length + found.goals.length

  return (
    <main className="page">
      <div className="search-bar">
        <label className="search-field">
          <SearchIcon size={18} strokeWidth={1.75} aria-hidden />
          <input autoFocus value={query} placeholder={t.search.placeholder} aria-label={t.search.title} enterKeyHint="search" onChange={(e) => setQuery(e.target.value)} />
          {query && (
            <button type="button" aria-label={t.common.clear} onClick={() => setQuery('')}>
              <X size={16} strokeWidth={2} aria-hidden />
            </button>
          )}
        </label>
        <button type="button" className="link" onClick={() => goBack('today')}>{t.common.cancel}</button>
      </div>

      <div className="chips chips--scroll filter-row">
        {(['all', 'habits', 'tasks', 'goals'] as Scope[]).map((s) => (
          <Chip key={s} selected={scope === s} onClick={() => setScope(s)}>{t.search.scopes[s]}</Chip>
        ))}
        <span className="chips__sep" />
        <select className="select chip-select" aria-label={t.task.category} value={category} onChange={(e) => setCategory(e.target.value as CategoryId | 'all')}>
          <option value="all">{t.search.anyCategory}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{t.cat[c]}</option>
          ))}
        </select>
      </div>

      {!found.active && <p className="quiet quiet--center">{t.search.hint}</p>}
      {found.active && total === 0 && <Empty icon={SearchX} title={t.search.emptyTitle} text={t.search.emptyText} />}

      {found.habits.length > 0 && (
        <section className="section section--first">
          <SectionHead title={t.nav.habits} count={String(found.habits.length)} />
          <div className="group">
            {found.habits.map((h) => {
              const Icon = habitIcon(h.icon)
              return (
                <button key={h.id} type="button" className="item item--link" style={tint(h.color)} onClick={() => navigate(`habits/${h.id}`)}>
                  <span className="tile">
                    <Icon size={18} strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="item__text">
                    <span className="item__title">{h.name}</span>
                    <span className="item__meta">{[t.cat[h.category], scheduleText(h, t, lang, weekStart), h.archivedAt && t.archive.inArchive].filter(Boolean).join(' · ')}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {found.tasks.length > 0 && (
        <section className="section">
          <SectionHead title={t.day.tasks} count={String(found.tasks.length)} />
          <div className="group">
            {found.tasks.map((x) => (
              <TaskRow key={x.id} task={x} showDate />
            ))}
          </div>
        </section>
      )}

      {found.goals.length > 0 && (
        <section className="section">
          <SectionHead title={t.goal.plural} count={String(found.goals.length)} />
          <div className="group">
            {found.goals.map((g) => (
              <button key={g.id} type="button" className="item item--link" onClick={() => navigate(`goals/${g.id}`)}>
                <span className="item__text">
                  <span className="item__title">{g.title}</span>
                  {g.description && <span className="item__meta">{g.description}</span>}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
