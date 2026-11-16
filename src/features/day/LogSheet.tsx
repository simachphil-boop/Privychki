import { ArrowRight, RotateCcw } from 'lucide-react'
import { fmtDay } from '../../lib/format'
import { useLang, useT } from '../../lib/i18n'
import { navigate } from '../../lib/router'
import { completeEntry, isDone, progressOf } from '../../lib/schedule'
import { useStore, useToday } from '../../store/store'
import type { DateKey } from '../../store/types'
import { Button, CheckGlyph, ProgressRing, Stepper, cx, tint } from '../../ui/kit'
import { useSheetClose } from '../../ui/Sheet'

/** Precise logging for a habit on one day: amount, minutes or checklist items. */
export function LogSheet({ habitId, date }: { habitId: string; date: DateKey }) {
  const t = useT()
  const lang = useLang()
  const close = useSheetClose()
  const today = useToday((s) => s.today)
  const habit = useStore((s) => s.habits.find((h) => h.id === habitId))
  const entry = useStore((s) => s.logs[habitId]?.[date])
  const setLog = useStore((s) => s.setLog)
  if (!habit) return null

  const value = entry?.value ?? 0
  const done = isDone(habit, entry)
  const setValue = (v: number) => setLog(habit.id, date, { value: Math.max(0, v) })
  const quick = habit.type === 'duration' ? [5, 10, 15, 30] : habit.target > 20 ? [habit.target / 4, habit.target / 2].map(Math.round) : []
  const unit = habit.type === 'duration' ? t.common.min : habit.unit

  return (
    <>
      <div className="sheet__body" style={tint(habit.color)}>
        <p className="log__date">{date === today ? t.common.today : fmtDay(date, lang, 'full')}</p>
        <h2 className="log__name">{habit.name}</h2>

        {(habit.type === 'numeric' || habit.type === 'duration') && (
          <div className="log__meter">
            <ProgressRing value={progressOf(habit, entry)} size={148} stroke={8}>
              <span className="log__value num">{value}</span>
              <span className="log__target num">
                {t.habit.outOf(habit.target)} {unit}
              </span>
            </ProgressRing>
            <Stepper value={value} min={0} max={99999} onChange={setValue} label={habit.name} />
            {quick.length > 0 && (
              <div className="chips log__quick">
                {quick.map((q) => (
                  <button key={q} type="button" className="chip" onClick={() => setValue(value + q)}>
                    +{q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {habit.type === 'checklist' && (
          <div className="group log__list">
            {habit.checklist.map((item) => {
              const on = entry?.items?.includes(item.id) ?? false
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cx('row', 'row--button', 'log__item', on && 'is-done')}
                  aria-pressed={on}
                  onClick={() => {
                    const items = on ? (entry?.items ?? []).filter((x) => x !== item.id) : [...(entry?.items ?? []), item.id]
                    setLog(habit.id, date, { value: items.length, items })
                  }}
                >
                  <span className={cx('tcheck__box', 'tcheck__box--square', on && 'is-on')}>{on && <CheckGlyph size={13} />}</span>
                  <span className="row__label">{item.title}</span>
                </button>
              )
            })}
          </div>
        )}

        {habit.type === 'boolean' && (
          <p className="note">{done ? t.habit.doneThatDay : t.habit.notDoneThatDay}</p>
        )}

        <div className="log__links">
          {value > 0 || entry?.items?.length ? (
            <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => setLog(habit.id, date, null)}>
              {t.habit.reset}
            </Button>
          ) : (
            <span />
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              close()
              navigate(`habits/${habit.id}`)
            }}
          >
            {t.habit.openDetails}
            <ArrowRight size={15} aria-hidden />
          </Button>
        </div>
      </div>
      <div className="sheet__foot">
        {done ? (
          <Button variant="primary" block onClick={close}>
            {t.common.done}
          </Button>
        ) : (
          <>
            <Button block onClick={close}>
              {t.common.close}
            </Button>
            <Button
              variant="primary"
              block
              onClick={() => {
                setLog(habit.id, date, completeEntry(habit))
                close()
              }}
            >
              {t.habit.completeAll}
            </Button>
          </>
        )}
      </div>
    </>
  )
}
