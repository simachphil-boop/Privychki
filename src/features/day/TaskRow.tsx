import { Bell, Target } from 'lucide-react'
import { fmtDay, fmtTime } from '../../lib/format'
import { useLang, useT } from '../../lib/i18n'
import { useStore } from '../../store/store'
import type { Task } from '../../store/types'
import { useUi } from '../../store/ui'
import { CheckGlyph, cx } from '../../ui/kit'

export function TaskRow({ task, showDate, hideGoal }: { task: Task; showDate?: boolean; hideGoal?: boolean }) {
  const t = useT()
  const lang = useLang()
  const toggleTask = useStore((s) => s.toggleTask)
  const timeFormat = useStore((s) => s.settings.timeFormat)
  const goal = useStore((s) => (task.goalId && !hideGoal ? s.goals.find((g) => g.id === task.goalId) : undefined))
  const openSheet = useUi((s) => s.openSheet)
  const meta = [
    showDate && task.date && fmtDay(task.date, lang, 'short'),
    task.time && fmtTime(task.time, timeFormat),
    task.category !== 'other' && t.cat[task.category],
  ].filter(Boolean)

  return (
    <div className={cx('item', 'item--task', task.done && 'is-done')}>
      <button
        type="button"
        className={cx('tcheck', `tcheck--${task.priority}`, task.done && 'is-done')}
        aria-pressed={task.done}
        aria-label={`${task.done ? t.task.unmark : t.task.mark}: ${task.title}`}
        onClick={() => {
          if (!task.done) navigator.vibrate?.(8)
          toggleTask(task.id)
        }}
      >
        <span className="tcheck__box">{task.done && <CheckGlyph size={13} />}</span>
      </button>
      <button type="button" className="item__body" onClick={() => openSheet({ type: 'task', id: task.id })}>
        <span className="item__text">
          <span className="item__title">{task.title}</span>
          {(meta.length > 0 || task.notes || goal || task.priority === 'high') && (
            <span className="item__meta num">
              {task.priority === 'high' && !task.done && <span className="prio">{t.task.priority.high}</span>}
              {meta.length > 0 && <span>{meta.join(' · ')}</span>}
              {task.remind && task.time && <Bell size={11} strokeWidth={2} aria-label={t.task.remind} />}
              {goal && (
                <span className="item__tag">
                  <Target size={11} strokeWidth={2} aria-hidden />
                  <span>{goal.title}</span>
                </span>
              )}
              {task.notes && <span className="item__notes">{task.notes}</span>}
            </span>
          )}
        </span>
      </button>
    </div>
  )
}
