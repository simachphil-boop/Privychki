import { ChartNoAxesColumn, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { addDays } from '../../lib/dates'
import { fmtDay, fmtPct, weekdayLabel } from '../../lib/format'
import { useLang, useT } from '../../lib/i18n'
import { buildInsights } from '../../lib/insights'
import { navigate } from '../../lib/router'
import { bestDay, bucketize, buildDays, byMonth, byWeekday, doneOf, grainFor, habitRows, heatmap, periodRange, totalsOf, type Period } from '../../lib/stats'
import { getData, useStore, useToday } from '../../store/store'
import { habitIcon } from '../../ui/icons'
import { Empty, PageHeader, ProgressBar, SectionHead, Segmented, cx, tint } from '../../ui/kit'
import { BarChart, Heatmap, LineChart, Strip } from './charts'

const HEAT_WEEKS = 18

export function Stats() {
  const t = useT()
  const lang = useLang()
  const today = useToday((s) => s.today)
  // Statistics read everything; recompute whenever any tracked data changes.
  const habits = useStore((s) => s.habits)
  const logs = useStore((s) => s.logs)
  const tasks = useStore((s) => s.tasks)
  const settings = useStore((s) => s.settings)
  const [period, setPeriod] = useState<Period>('30')
  const ws = settings.weekStart

  const m = useMemo(() => {
    const data = getData()
    const [from, to] = periodRange(period, data, today)
    const days = buildDays(data, from, to, today)
    const totals = totalsOf(days)
    const len = days.length
    const prev = period === 'all' ? null : totalsOf(buildDays(data, addDays(from, -len), addDays(from, -1), today))
    const grain = grainFor(len)
    const rows = habitRows(data, from, to, today, period === '7' ? 7 : 30)
    const ranked = rows.filter((r) => r.rate !== null && r.due >= Math.min(3, len))
    return {
      from,
      to,
      days,
      totals,
      prev,
      grain,
      buckets: bucketize(days, grain, ws),
      weekdays: byWeekday(days, ws),
      months: byMonth(data, today, 6),
      rows,
      stable: [...ranked].sort((a, b) => b.rate! - a.rate! || b.done - a.done).slice(0, 3),
      skipped: [...ranked].filter((r) => r.missed > 0).sort((a, b) => b.missed - a.missed || a.rate! - b.rate!).slice(0, 3),
      heat: heatmap(data, today, HEAT_WEEKS),
      best: bestDay(days),
      insights: buildInsights(data, today, t, lang),
      tracked: data.habits.length + data.tasks.length > 0,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habits, logs, tasks, settings, period, today, t, lang])

  const rangeLabel = (a: string, b: string) => (a === b ? fmtDay(a, lang, 'short') : `${fmtDay(a, lang, 'short')} – ${fmtDay(b, lang, 'short')}`)
  const delta = m.prev && m.prev.rate !== null && m.totals.rate !== null ? Math.round((m.totals.rate - m.prev.rate) * 100) : null
  const bestWeekday = [...m.weekdays].filter((d) => d.rate !== null).sort((a, b) => b.rate! - a.rate!)[0]
  const empty = m.totals.habitDue + m.totals.taskTotal === 0

  if (!m.tracked) {
    return (
      <main className="page">
        <PageHeader title={t.nav.stats} eyebrow={t.stats.eyebrow} />
        <Empty icon={ChartNoAxesColumn} title={t.stats.emptyTitle} text={t.stats.emptyText} />
      </main>
    )
  }

  return (
    <main className="page">
      <PageHeader title={t.nav.stats} eyebrow={rangeLabel(m.from, m.to)} />
      <Segmented<Period> label={t.stats.period} value={period} onChange={setPeriod} options={(['7', '30', '90', 'all'] as Period[]).map((p) => ({ value: p, label: t.stats.periods[p] }))} />

      <section className="hero">
        <div className="hero__main">
          <span className="hero__value num">{fmtPct(m.totals.rate)}</span>
          <div className="hero__side">
            <span className="hero__label">{t.stats.completion}</span>
            {delta !== null && (
              <span className={cx('delta', delta > 0 && 'is-up', delta < 0 && 'is-down')}>
                {delta > 0 ? <TrendingUp size={14} aria-hidden /> : delta < 0 ? <TrendingDown size={14} aria-hidden /> : <Minus size={14} aria-hidden />}
                {t.stats.delta(delta)}
              </span>
            )}
          </div>
        </div>
        <div className="figures figures--3">
          <div className="figure">
            <span className="figure__value num">{m.totals.habitDone}</span>
            <span className="figure__label">{t.stats.habitsDone}</span>
          </div>
          <div className="figure">
            <span className="figure__value num">{m.totals.taskDone}</span>
            <span className="figure__label">{t.stats.tasksDone}</span>
          </div>
          <div className="figure">
            <span className="figure__value num">{m.best ? fmtDay(m.best.date, lang, 'short') : '—'}</span>
            <span className="figure__label">{m.best ? t.stats.bestDay(doneOf(m.best)) : t.stats.bestDayNone}</span>
          </div>
        </div>
      </section>

      {m.insights.length > 0 && (
        <section className="section">
          <SectionHead title={t.stats.insights} />
          <ul className="insights">
            {m.insights.map((i) => (
              <li key={i.id} className={`insight insight--${i.tone}`}>
                {i.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      {empty ? (
        <section className="section">
          <Empty icon={ChartNoAxesColumn} title={t.stats.periodEmptyTitle} text={t.stats.periodEmptyText} />
        </section>
      ) : (
        <>
          <section className="section">
            <SectionHead title={m.grain === 'day' ? t.stats.daily : m.grain === 'week' ? t.stats.weekly : t.stats.monthly} />
            <div className="group chart-card">
              <LineChart
                points={m.buckets.map((b) => ({ label: m.grain === 'day' ? fmtDay(b.from, lang, 'short') : m.grain === 'week' ? rangeLabel(b.from, b.to) : fmtDay(b.from, lang, 'monthYear'), value: b.rate }))}
                format={(v) => fmtPct(v)}
              />
            </div>
          </section>

          <section className="section">
            <SectionHead title={t.stats.rates} />
            <div className="group">
              {(
                [
                  [t.day.habits, m.totals.habitRate, m.totals.habitDone, m.totals.habitDue],
                  [t.day.tasks, m.totals.taskRate, m.totals.taskDone, m.totals.taskTotal],
                ] as const
              ).map(([label, rate, done, due]) => (
                <div key={label} className="rate">
                  <div className="rate__head">
                    <span>{label}</span>
                    <span className="rate__count num">{t.stats.outOf(done, due)}</span>
                    <b className="num">{fmtPct(rate)}</b>
                  </div>
                  <ProgressBar value={rate ?? 0} />
                </div>
              ))}
            </div>
          </section>

          <section className="section">
            <SectionHead title={t.stats.weekdays} />
            <div className="group chart-card">
              <BarChart
                data={m.weekdays.map((d) => ({ key: String(d.weekday), label: weekdayLabel(d.weekday, lang, 'short'), value: d.rate }))}
                format={(v) => fmtPct(v)}
                max={1}
                highlight={bestWeekday ? String(bestWeekday.weekday) : undefined}
                ticks={[[1, '100%'], [0.5, '50%']]}
              />
              {bestWeekday && bestWeekday.rate! > 0 && <p className="chart-note">{t.stats.bestWeekday(weekdayLabel(bestWeekday.weekday, lang, 'long'), fmtPct(bestWeekday.rate))}</p>}
            </div>
          </section>

          {m.rows.length > 0 && (
            <section className="section">
              <SectionHead title={t.stats.consistency} />
              <div className="group">
                {[...m.rows].sort((a, b) => (b.rate ?? -1) - (a.rate ?? -1)).map((r) => {
                  const Icon = habitIcon(r.habit.icon)
                  return (
                    <button key={r.habit.id} type="button" className="cons" style={tint(r.habit.color)} onClick={() => navigate(`habits/${r.habit.id}`)}>
                      <span className="cons__head">
                        <Icon size={15} strokeWidth={1.75} className="cons__icon" aria-hidden />
                        <span className="cons__name">{r.habit.name}</span>
                        <span className="cons__count num">{t.stats.outOf(r.done, r.due)}</span>
                        <b className="num">{fmtPct(r.rate)}</b>
                      </span>
                      <Strip cells={r.cells} />
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {(m.stable.length > 0 || m.skipped.length > 0) && (
            <section className="section duo">
              <div>
                <SectionHead title={t.stats.stable} />
                {m.stable.length ? (
                  <ol className="rank">
                    {m.stable.map((r) => (
                      <li key={r.habit.id}>
                        <span>{r.habit.name}</span>
                        <b className="num">{fmtPct(r.rate)}</b>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="quiet">{t.stats.notEnough}</p>
                )}
              </div>
              <div>
                <SectionHead title={t.stats.skipped} />
                {m.skipped.length ? (
                  <ol className="rank">
                    {m.skipped.map((r) => (
                      <li key={r.habit.id}>
                        <span>{r.habit.name}</span>
                        <b className="num">{t.stats.missed(r.missed)}</b>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="quiet">{t.stats.noSkips}</p>
                )}
              </div>
            </section>
          )}
        </>
      )}

      <section className="section">
        <SectionHead title={t.stats.months} />
        <div className="group chart-card">
          <BarChart data={m.months.map((b) => ({ key: b.from, label: fmtDay(b.from, lang, 'monthShort'), value: b.done }))} format={(v) => t.stats.completions(v)} />
        </div>
      </section>

      <section className="section">
        <SectionHead title={t.stats.heatmap} count={t.stats.heatWeeks(HEAT_WEEKS)} />
        <div className="group chart-card">
          <Heatmap
            cells={m.heat.cells.map((c) => ({ key: c.date, label: fmtDay(c.date, lang, 'medium'), count: c.count, future: c.future }))}
            max={m.heat.max}
            rowLabels={Array.from({ length: 7 }, (_, i) => weekdayLabel((i + ws) % 7, lang, 'short'))}
            colLabels={Array.from({ length: HEAT_WEEKS }, (_, i) => {
              const first = m.heat.cells[i * 7].date
              const prev = i > 0 ? m.heat.cells[(i - 1) * 7].date : null
              return !prev || prev.slice(0, 7) !== first.slice(0, 7) ? (i > HEAT_WEEKS - 2 ? '' : fmtDay(first, lang, 'monthShort')) : ''
            })}
            format={(n) => t.stats.completions(n)}
          />
        </div>
      </section>
    </main>
  )
}
