import { describe, expect, it } from 'vitest'
import type { Habit, Logs } from '../store/types'
import { addDays, diffDays, monthGrid, rangeKeys, startOfWeek } from './dates'
import { dayLoad, habitStats, isDueOn, isScheduledOn, progressOf } from './schedule'

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'h',
  name: 'Test',
  description: '',
  icon: 'check',
  color: 'pine',
  category: 'other',
  type: 'boolean',
  target: 1,
  unit: '',
  checklist: [],
  schedule: { kind: 'daily' },
  reminderTime: null,
  startDate: '2026-01-01',
  goalCount: null,
  archivedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
})

const done = (days: string[]): Logs => ({ h: Object.fromEntries(days.map((d) => [d, { value: 1 }])) })

describe('dates', () => {
  it('handles month and year boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(diffDays('2026-03-30', '2026-03-28')).toBe(2)
  })
  it('finds the start of the week for both conventions', () => {
    // 2026-01-07 is a Wednesday.
    expect(startOfWeek('2026-01-07', 1)).toBe('2026-01-05')
    expect(startOfWeek('2026-01-07', 0)).toBe('2026-01-04')
  })
  it('builds whole-week month grids', () => {
    const g = monthGrid('2026-02-10', 1)
    expect(g.length % 7).toBe(0)
    expect(g[0]).toBe('2026-01-26')
  })
})

describe('schedule', () => {
  it('respects weekdays and intervals', () => {
    const wd = habit({ schedule: { kind: 'weekdays', days: [1, 3] } })
    expect(isScheduledOn(wd, '2026-01-05')).toBe(true) // Monday
    expect(isScheduledOn(wd, '2026-01-06')).toBe(false)
    const every3 = habit({ schedule: { kind: 'interval', every: 3 } })
    expect(rangeKeys('2026-01-01', '2026-01-07').filter((k) => isScheduledOn(every3, k))).toEqual([
      '2026-01-01',
      '2026-01-04',
      '2026-01-07',
    ])
    expect(isScheduledOn(habit(), '2025-12-31')).toBe(false)
  })

  it('measures partial progress per type', () => {
    expect(progressOf(habit({ type: 'numeric', target: 8 }), { value: 4 })).toBe(0.5)
    expect(progressOf(habit({ type: 'duration', target: 30 }), { value: 45 })).toBe(1)
    const cl = habit({ type: 'checklist', checklist: [{ id: 'a', title: 'A' }, { id: 'b', title: 'B' }] })
    expect(progressOf(cl, { value: 0, items: ['a'] })).toBe(0.5)
    expect(progressOf(cl, { value: 0, items: ['a', 'b', 'gone'] })).toBe(1)
  })

  it('drops a flexible habit from the day once the quota is met', () => {
    const h = habit({ schedule: { kind: 'perWeek', count: 2 } })
    const logs = done(['2026-01-05', '2026-01-06'])
    expect(isDueOn(h, logs, '2026-01-06', 1)).toBe(true)
    expect(isDueOn(h, logs, '2026-01-07', 1)).toBe(false)
    expect(isDueOn(h, logs, '2026-01-12', 1)).toBe(true)
  })
})

describe('streaks', () => {
  it('counts the current streak and keeps it while today is still open', () => {
    const h = habit()
    const logs = done(['2026-01-01', '2026-01-02', '2026-01-04', '2026-01-05', '2026-01-06'])
    const s = habitStats(h, logs, '2026-01-07', 1)
    expect(s.current).toBe(3)
    expect(s.best).toBe(3)
    expect(s.total).toBe(5)
    expect(s.rate).toBeCloseTo(5 / 6)
  })

  it('resets after a missed day but keeps the best streak and history', () => {
    const s = habitStats(habit(), done(['2026-01-01', '2026-01-02', '2026-01-03']), '2026-01-06', 1)
    expect(s.current).toBe(0)
    expect(s.best).toBe(3)
    expect(s.total).toBe(3)
  })

  it('ignores unscheduled days in a weekday streak', () => {
    const h = habit({ schedule: { kind: 'weekdays', days: [1, 3, 5] }, startDate: '2026-01-05' })
    const s = habitStats(h, done(['2026-01-05', '2026-01-07', '2026-01-09']), '2026-01-11', 1)
    expect(s.current).toBe(3)
    expect(s.rate).toBe(1)
  })

  it('counts flexible streaks in periods', () => {
    const h = habit({ schedule: { kind: 'perWeek', count: 2 }, startDate: '2026-01-05' })
    const logs = done(['2026-01-05', '2026-01-08', '2026-01-13', '2026-01-14', '2026-01-19'])
    const s = habitStats(h, logs, '2026-01-20', 1)
    expect(s.unit).toBe('week')
    expect(s.current).toBe(2)
    expect(s.rate).toBe(1)
  })
})

describe('dayLoad', () => {
  it('does not count today as a miss and charges flexible shortfalls to the period end', () => {
    const daily = habit()
    expect(dayLoad(daily, {}, '2026-01-05', '2026-01-05', 1)).toEqual({ due: 0, done: 0 })
    expect(dayLoad(daily, {}, '2026-01-04', '2026-01-05', 1)).toEqual({ due: 1, done: 0 })
    const flex = habit({ schedule: { kind: 'perWeek', count: 3 }, startDate: '2026-01-05' })
    const logs = done(['2026-01-06'])
    expect(dayLoad(flex, logs, '2026-01-06', '2026-01-20', 1)).toEqual({ due: 1, done: 1 })
    expect(dayLoad(flex, logs, '2026-01-07', '2026-01-20', 1)).toEqual({ due: 0, done: 0 })
    expect(dayLoad(flex, logs, '2026-01-11', '2026-01-20', 1)).toEqual({ due: 2, done: 0 })
  })
})
