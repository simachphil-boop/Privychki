import { Archive as ArchiveIcon } from 'lucide-react'
import { fmtDay } from '../../lib/format'
import { useLang, useT } from '../../lib/i18n'
import { useStore } from '../../store/store'
import { toast, useUi } from '../../store/ui'
import { habitIcon } from '../../ui/icons'
import { Button, Empty, PageHeader, SectionHead, tint } from '../../ui/kit'
import { withUndo } from '../../lib/actions'
import { navigate } from '../../lib/router'

export function Archive() {
  const t = useT()
  const lang = useLang()
  const habits = useStore((s) => s.habits).filter((h) => h.archivedAt)
  const tasks = useStore((s) => s.tasks).filter((x) => x.archivedAt)
  const goals = useStore((s) => s.goals).filter((g) => g.archivedAt)
  const logs = useStore((s) => s.logs)
  const { updateHabit, updateTask, updateGoal, deleteHabit, deleteTask, deleteGoal } = useStore.getState()
  const ask = useUi((s) => s.ask)
  const empty = habits.length + tasks.length + goals.length === 0

  return (
    <main className="page">
      <PageHeader title={t.archive.title} back="profile" backLabel={t.nav.profile} />
      {empty && <Empty icon={ArchiveIcon} title={t.archive.emptyTitle} text={t.archive.emptyText} />}

      {habits.length > 0 && (
        <section className="section section--first">
          <SectionHead title={t.nav.habits} count={String(habits.length)} />
          <div className="group">
            {habits.map((h) => {
              const Icon = habitIcon(h.icon)
              return (
                <div key={h.id} className="item" style={tint(h.color)}>
                  <button type="button" className="item__body" onClick={() => navigate(`habits/${h.id}`)}>
                    <span className="tile">
                      <Icon size={18} strokeWidth={1.75} aria-hidden />
                    </span>
                    <span className="item__text">
                      <span className="item__title">{h.name}</span>
                      <span className="item__meta num">{t.habit.completions(Object.keys(logs[h.id] ?? {}).length)}</span>
                    </span>
                  </button>
                  <Button
                    size="sm"
                    onClick={() => {
                      updateHabit(h.id, { archivedAt: null })
                      toast(t.habit.restored)
                    }}
                  >
                    {t.common.restore}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => ask({ title: t.habit.deleteTitle(h.name), body: t.habit.deleteBody, confirmLabel: t.common.delete, danger: true, onConfirm: () => deleteHabit(h.id) })}>
                    {t.common.delete}
                  </Button>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {goals.length > 0 && (
        <section className="section">
          <SectionHead title={t.goal.plural} count={String(goals.length)} />
          <div className="group">
            {goals.map((g) => (
              <div key={g.id} className="item">
                <button type="button" className="item__body" onClick={() => navigate(`goals/${g.id}`)}>
                  <span className="item__text">
                    <span className="item__title">{g.title}</span>
                  </span>
                </button>
                <Button
                  size="sm"
                  onClick={() => {
                    updateGoal(g.id, { archivedAt: null })
                    toast(t.goal.restored)
                  }}
                >
                  {t.common.restore}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => ask({ title: t.goal.deleteTitle(g.title), body: t.goal.deleteBody, confirmLabel: t.common.delete, danger: true, onConfirm: () => deleteGoal(g.id) })}>
                  {t.common.delete}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tasks.length > 0 && (
        <section className="section">
          <SectionHead title={t.day.tasks} count={String(tasks.length)} />
          <div className="group">
            {tasks.map((x) => (
              <div key={x.id} className="item">
                <div className="item__body item__body--static">
                  <span className="item__text">
                    <span className="item__title">{x.title}</span>
                    <span className="item__meta num">{[x.date && fmtDay(x.date, lang, 'medium'), x.done ? t.view.statuses.done : t.view.statuses.active].filter(Boolean).join(' · ')}</span>
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    updateTask(x.id, { archivedAt: null })
                    toast(t.task.restored)
                  }}
                >
                  {t.common.restore}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => withUndo(() => deleteTask(x.id), t.task.deleted)}>
                  {t.common.delete}
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
