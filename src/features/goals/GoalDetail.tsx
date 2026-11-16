import { Pencil, Plus, RotateCcw, Target, Trophy } from 'lucide-react'
import { useMemo } from 'react'
import { fmtPct } from '../../lib/format'
import { useLang, useT } from '../../lib/i18n'
import { navigate } from '../../lib/router'
import { habitStats } from '../../lib/schedule'
import { goalProgress, sortTasks } from '../../lib/select'
import { getData, useStore, useToday } from '../../store/store'
import { toast, useUi } from '../../store/ui'
import { habitIcon } from '../../ui/icons'
import { Button, CheckGlyph, Empty, IconButton, PageHeader, ProgressRing, SectionHead, cx, tint } from '../../ui/kit'
import { TaskRow } from '../day/TaskRow'
import { deadlineText } from './Goals'

export function GoalDetail({ id }: { id: string }) {
  const t = useT()
  const lang = useLang()
  const today = useToday((s) => s.today)
  const goal = useStore((s) => s.goals.find((g) => g.id === id))
  const habits = useStore((s) => s.habits)
  const logs = useStore((s) => s.logs)
  const tasks = useStore((s) => s.tasks)
  const weekStart = useStore((s) => s.settings.weekStart)
  const updateGoal = useStore((s) => s.updateGoal)
  const openSheet = useUi((s) => s.openSheet)
  const p = useMemo(() => (goal ? goalProgress(goal, getData(), today) : null), [goal, tasks, logs, habits, today]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!goal || !p) {
    return (
      <main className="page">
        <PageHeader title={t.goal.notFound} back="goals" backLabel={t.goal.plural} />
        <Empty icon={Target} title={t.goal.notFound} />
      </main>
    )
  }

  const linkedHabits = habits.filter((h) => goal.habitIds.includes(h.id))
  const linkedTasks = sortTasks(tasks.filter((x) => x.goalId === goal.id && !x.archivedAt), 'time')
  const deadline = deadlineText(goal, today, t, lang)
  const late = !goal.completedAt && goal.deadline !== null && goal.deadline < today
  const toggleMilestone = (mid: string) => updateGoal(goal.id, { milestones: goal.milestones.map((m) => (m.id === mid ? { ...m, done: !m.done } : m)) })

  return (
    <main className="page" style={tint(goal.color)}>
      <PageHeader
        title={goal.title}
        back="goals"
        backLabel={t.goal.plural}
        actions={<IconButton label={t.common.edit} icon={Pencil} size={18} onClick={() => openSheet({ type: 'goal', id: goal.id })} />}
      />
      {goal.description && <p className="note detail-note">{goal.description}</p>}

      <div className="goal-hero">
        <ProgressRing value={p.value} size={96} stroke={8}>
          <span className="overview__pct num">{Math.round(p.value * 100)}<small>%</small></span>
        </ProgressRing>
        <div className="goal-hero__text">
          <p className="goal-hero__state">{goal.completedAt ? t.goal.stateAchieved : p.total > 0 ? t.goal.steps(p.done, p.total) : p.habitRate !== null ? t.goal.byHabits : t.goal.noSteps}</p>
          {deadline && <p className={cx('note', late && 'is-late')}>{deadline}</p>}
          {p.habitRate !== null && p.total > 0 && <p className="note">{t.goal.habitRate(fmtPct(p.habitRate))}</p>}
        </div>
      </div>

      <section className="section">
        <SectionHead title={t.goal.milestones} count={goal.milestones.length ? `${goal.milestones.filter((m) => m.done).length}/${goal.milestones.length}` : undefined} />
        {goal.milestones.length ? (
          <div className="group">
            {goal.milestones.map((m) => (
              <button key={m.id} type="button" className={cx('row', 'row--button', 'log__item', m.done && 'is-done')} aria-pressed={m.done} onClick={() => toggleMilestone(m.id)}>
                <span className={cx('tcheck__box', 'tcheck__box--square', m.done && 'is-on')}>{m.done && <CheckGlyph size={13} />}</span>
                <span className="row__label">{m.title}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="quiet">{t.goal.noMilestones}</p>
        )}
      </section>

      <section className="section">
        <SectionHead title={t.goal.linkedHabits} />
        {linkedHabits.length ? (
          <div className="group">
            {linkedHabits.map((h) => {
              const Icon = habitIcon(h.icon)
              const s = habitStats(h, logs, today, weekStart)
              return (
                <button key={h.id} type="button" className="item item--link" style={tint(h.color)} onClick={() => navigate(`habits/${h.id}`)}>
                  <span className="tile">
                    <Icon size={18} strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="item__text">
                    <span className="item__title">{h.name}</span>
                    <span className="item__meta num">{t.habit.regularity}: {fmtPct(s.rate)}</span>
                  </span>
                  <span className="item__trail num">{t.habit.streak(s.current, s.unit)}</span>
                </button>
              )
            })}
          </div>
        ) : (
          <p className="quiet">{t.goal.noHabits}</p>
        )}
      </section>

      <section className="section">
        <SectionHead title={t.day.tasks} count={linkedTasks.length ? `${linkedTasks.filter((x) => x.done).length}/${linkedTasks.length}` : undefined}>
          <IconButton label={t.task.create} icon={Plus} size={18} onClick={() => openSheet({ type: 'create', kind: 'task', goalId: goal.id })} />
        </SectionHead>
        {linkedTasks.length ? (
          <div className="group">
            {linkedTasks.map((x) => (
              <TaskRow key={x.id} task={x} showDate hideGoal />
            ))}
          </div>
        ) : (
          <p className="quiet">{t.goal.noTasks}</p>
        )}
      </section>

      <div className="center-action">
        {goal.completedAt ? (
          <Button size="sm" icon={RotateCcw} onClick={() => updateGoal(goal.id, { completedAt: null })}>{t.goal.reopen}</Button>
        ) : (
          <Button
            variant="primary"
            icon={Trophy}
            onClick={() => {
              updateGoal(goal.id, { completedAt: new Date().toISOString() })
              toast(t.goal.achievedToast)
            }}
          >
            {t.goal.markAchieved}
          </Button>
        )}
      </div>
    </main>
  )
}
