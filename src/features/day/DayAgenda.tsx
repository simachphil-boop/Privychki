import { Bell, Plus, Repeat, SlidersHorizontal } from 'lucide-react'
import { useMemo, useState } from 'react'
import { fmtTime } from '../../lib/format'
import { useT } from '../../lib/i18n'
import { doneOn } from '../../lib/schedule'
import { filterTasks, groupTasks, habitsOn, isFiltered, overdueTasks, remindersOn, tasksOn } from '../../lib/select'
import { useStore, useToday } from '../../store/store'
import type { DateKey } from '../../store/types'
import { toast, useUi } from '../../store/ui'
import { Button, Empty, IconButton, SectionHead, cx } from '../../ui/kit'
import { HabitRow } from './HabitRow'
import { TaskRow } from './TaskRow'

/** Type a title, press Enter — the fastest way to add a task to a day. */
function InlineTaskAdd({ date }: { date: DateKey }) {
  const t = useT()
  const addTask = useStore((s) => s.addTask)
  const [title, setTitle] = useState('')
  return (
    <form
      className="inline-add"
      onSubmit={(e) => {
        e.preventDefault()
        const clean = title.trim()
        if (!clean) return
        addTask({ title: clean, notes: '', date, time: null, priority: 'medium', category: 'other', goalId: null, remind: false })
        setTitle('')
      }}
    >
      <Plus size={18} strokeWidth={1.75} aria-hidden />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t.day.addTaskPlaceholder}
        aria-label={t.day.addTaskPlaceholder}
        maxLength={140}
        enterKeyHint="done"
      />
    </form>
  )
}

/** Habits, tasks and reminders of a single day. Shared by Today and Calendar. */
export function DayAgenda({ date }: { date: DateKey }) {
  const t = useT()
  const today = useToday((s) => s.today)
  const habits = useStore((s) => s.habits)
  const logs = useStore((s) => s.logs)
  const tasks = useStore((s) => s.tasks)
  const reminders = useStore((s) => s.reminders)
  const settings = useStore((s) => s.settings)
  const updateTask = useStore((s) => s.updateTask)
  const openSheet = useUi((s) => s.openSheet)
  const view = settings.taskView

  const dayHabits = useMemo(() => habitsOn({ habits, logs, settings }, date), [habits, logs, settings, date])
  const habitsDone = dayHabits.filter((h) => doneOn(h, logs, date)).length
  const dayTasks = useMemo(() => tasksOn(tasks, date), [tasks, date])
  const groups = useMemo(() => groupTasks(filterTasks(dayTasks, view), view), [dayTasks, view])
  const overdue = useMemo(() => (date === today ? overdueTasks(tasks, today) : []), [tasks, date, today])
  const dayReminders = useMemo(() => remindersOn(reminders, date), [reminders, date])
  const hasAnyHabit = habits.some((h) => !h.archivedAt)
  const shown = groups.reduce((n, g) => n + g.tasks.length, 0)

  return (
    <>
      <section className="section">
        <SectionHead title={t.day.habits} count={dayHabits.length ? `${habitsDone}/${dayHabits.length}` : undefined} />
        {dayHabits.length > 0 ? (
          <div className="group">
            {dayHabits.map((h) => (
              <HabitRow key={h.id} habit={h} date={date} />
            ))}
          </div>
        ) : hasAnyHabit ? (
          <p className="quiet">{t.day.noHabitsToday}</p>
        ) : (
          <Empty icon={Repeat} title={t.day.noHabitsTitle} text={t.day.noHabitsText}>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => openSheet({ type: 'create', kind: 'habit' })}>
              {t.day.addHabit}
            </Button>
          </Empty>
        )}
      </section>

      <section className="section">
        <SectionHead
          title={t.day.tasks}
          count={dayTasks.length ? `${dayTasks.filter((x) => x.done).length}/${dayTasks.length}` : undefined}
        >
          <IconButton
            label={t.day.viewOptions}
            icon={SlidersHorizontal}
            size={18}
            className={cx(isFiltered(view) && 'is-active')}
            onClick={() => openSheet({ type: 'taskView' })}
          />
        </SectionHead>

        {overdue.length > 0 && (
          <>
            <div className="subhead subhead--row">
              <span className="subhead__warn">{t.day.overdue(overdue.length)}</span>
              <button
                type="button"
                className="link"
                onClick={() => {
                  overdue.forEach((x) => updateTask(x.id, { date: today }))
                  toast(t.day.movedToday(overdue.length))
                }}
              >
                {t.day.moveAllToday}
              </button>
            </div>
            <div className="group">
              {overdue.map((x) => (
                <TaskRow key={x.id} task={x} showDate />
              ))}
            </div>
          </>
        )}

        {groups.map((g) => (
          <div key={g.part ?? 'all'} className="task-group">
            {g.part && <p className="subhead">{t.day.parts[g.part]}</p>}
            <div className="group">
              {g.tasks.map((x) => (
                <TaskRow key={x.id} task={x} />
              ))}
            </div>
          </div>
        ))}

        {dayTasks.length > 0 && shown === 0 && <p className="quiet">{t.day.filteredOut}</p>}
        {dayTasks.length === 0 && overdue.length === 0 && <p className="quiet">{date < today ? t.day.noTasksPast : t.day.noTasksText}</p>}
        <InlineTaskAdd date={date} />
      </section>

      {dayReminders.length > 0 && (
        <section className="section">
          <SectionHead title={t.day.reminders} />
          <div className="group">
            {dayReminders.map((r) => (
              <button key={r.id} type="button" className={cx('item', 'item--reminder', !r.enabled && 'is-off')} onClick={() => openSheet({ type: 'reminder', id: r.id })}>
                <span className="item__time num">{fmtTime(r.time, settings.timeFormat)}</span>
                <span className="item__text">
                  <span className="item__title">{r.title}</span>
                  {r.repeat !== 'none' && <span className="item__meta">{t.reminder.repeat[r.repeat]}</span>}
                </span>
                <Bell size={15} strokeWidth={1.75} className="item__trail" aria-hidden />
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
