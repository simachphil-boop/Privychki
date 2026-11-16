import { Check, Plus, Target } from 'lucide-react'
import { useMemo } from 'react'
import { diffDays } from '../../lib/dates'
import { fmtDay } from '../../lib/format'
import { useLang, useT, type Dict } from '../../lib/i18n'
import { navigate } from '../../lib/router'
import { goalProgress } from '../../lib/select'
import { getData, useStore, useToday } from '../../store/store'
import type { DateKey, Goal, Lang } from '../../store/types'
import { useUi } from '../../store/ui'
import { Button, Empty, ProgressRing, cx, tint } from '../../ui/kit'

export function deadlineText(goal: Goal, today: DateKey, t: Dict, lang: Lang): string | null {
  if (goal.completedAt) return t.goal.achievedOn(fmtDay(goal.completedAt.slice(0, 10), lang, 'long'))
  if (!goal.deadline) return null
  const left = diffDays(goal.deadline, today)
  const date = fmtDay(goal.deadline, lang, goal.deadline.slice(0, 4) === today.slice(0, 4) ? 'medium' : 'long')
  return left < 0 ? t.goal.overdue(date, -left) : left === 0 ? t.goal.dueToday : t.goal.due(date, left)
}

function GoalRow({ goal }: { goal: Goal }) {
  const t = useT()
  const lang = useLang()
  const today = useToday((s) => s.today)
  const tasks = useStore((s) => s.tasks)
  const logs = useStore((s) => s.logs)
  const p = useMemo(() => goalProgress(goal, getData(), today), [goal, tasks, logs, today]) // eslint-disable-line react-hooks/exhaustive-deps
  const deadline = deadlineText(goal, today, t, lang)
  const late = !goal.completedAt && goal.deadline !== null && goal.deadline < today
  return (
    <button type="button" className="item item--link item--goal" style={tint(goal.color)} onClick={() => navigate(`goals/${goal.id}`)}>
      <ProgressRing value={p.value} size={40} stroke={3.5}>
        {goal.completedAt ? <Check size={16} strokeWidth={2.25} aria-hidden /> : <span className="ring__pct num">{Math.round(p.value * 100)}</span>}
      </ProgressRing>
      <span className="item__text">
        <span className="item__title">{goal.title}</span>
        <span className={cx('item__meta num', late && 'is-late')}>
          <span className="item__notes item__notes--strong">{[p.total > 0 && t.goal.steps(p.done, p.total), deadline].filter(Boolean).join(' · ') || t.goal.noSteps}</span>
        </span>
      </span>
    </button>
  )
}

/** Goals list, shown as the second segment of the Habits tab. */
export function Goals() {
  const t = useT()
  const goals = useStore((s) => s.goals)
  const openSheet = useUi((s) => s.openSheet)
  const live = goals.filter((g) => !g.archivedAt)
  const active = live.filter((g) => !g.completedAt)
  const achieved = live.filter((g) => g.completedAt)

  if (live.length === 0) {
    return (
      <div className="section">
        <Empty icon={Target} title={t.goal.emptyTitle} text={t.goal.emptyText}>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => openSheet({ type: 'create', kind: 'goal' })}>{t.goal.create}</Button>
        </Empty>
      </div>
    )
  }
  return (
    <>
      {active.length > 0 && (
        <div className="group group--spaced">
          {active.map((g) => (
            <GoalRow key={g.id} goal={g} />
          ))}
        </div>
      )}
      {achieved.length > 0 && (
        <>
          <p className="subhead subhead--section">{t.goal.achieved}</p>
          <div className="group">
            {achieved.map((g) => (
              <GoalRow key={g.id} goal={g} />
            ))}
          </div>
        </>
      )}
      <div className="center-action">
        <Button size="sm" icon={Plus} onClick={() => openSheet({ type: 'create', kind: 'goal' })}>{t.goal.create}</Button>
      </div>
    </>
  )
}
