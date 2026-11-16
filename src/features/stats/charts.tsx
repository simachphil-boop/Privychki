import { useState, type CSSProperties, type PointerEvent } from 'react'
import { cx } from '../../ui/kit'

export interface BarDatum {
  key: string
  label: string
  /** null = no data for this slot. */
  value: number | null
}

interface BarChartProps {
  data: BarDatum[]
  format: (v: number) => string
  /** Fixed scale maximum, e.g. 1 for rates. Defaults to the largest value. */
  max?: number
  /** Print every n-th x label; all by default. */
  labelEvery?: number
  highlight?: string
  /** Reference lines as [fraction of max, label]. */
  ticks?: [number, string][]
}

/** Thin vertical bars on a shared baseline, with a tooltip on hover, focus or touch. */
export function BarChart({ data, format, max, labelEvery = 1, highlight, ticks }: BarChartProps) {
  const [active, setActive] = useState<string | null>(null)
  const top = max ?? Math.max(1, ...data.map((d) => d.value ?? 0))
  return (
    <div className={cx('bars', ticks && 'bars--ticks')} onPointerLeave={() => setActive(null)}>
      <div className="bars__plot">
        {ticks?.map(([at, label]) => (
          <span key={label} className="bars__tick" style={{ bottom: `${at * 100}%` }}>
            <i>{label}</i>
          </span>
        ))}
        {data.map((d) => {
          const on = active === d.key
          return (
            <button
              key={d.key}
              type="button"
              className={cx('bars__col', on && 'is-active', active && !on && 'is-dim', highlight === d.key && 'is-highlight')}
              aria-label={`${d.label}: ${d.value === null ? '—' : format(d.value)}`}
              onPointerEnter={() => setActive(d.key)}
              onFocus={() => setActive(d.key)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(d.key)}
            >
              {on && (
                <span className="tip" role="tooltip">
                  <b>{d.value === null ? '—' : format(d.value)}</b>
                  <span>{d.label}</span>
                </span>
              )}
              <span className={cx('bars__bar', (d.value ?? 0) === 0 && 'is-zero')} style={{ height: `${Math.min(1, (d.value ?? 0) / top) * 100}%` }} />
            </button>
          )
        })}
      </div>
      <div className="bars__axis" aria-hidden>
        {data.map((d, i) => (
          <span key={d.key}>{i % labelEvery === 0 ? d.label : ''}</span>
        ))}
      </div>
    </div>
  )
}

export interface LinePoint {
  label: string
  /** 0…1, or null for a gap. */
  value: number | null
}

/** A single completion-rate line on a fixed 0–100% scale with a crosshair. */
export function LineChart({ points, format }: { points: LinePoint[]; format: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null)
  const n = points.length
  const x = (i: number) => (n === 1 ? 50 : (i / (n - 1)) * 100)
  const y = (v: number) => 100 - v * 100

  // Break the path at gaps so missing days are not drawn as zero.
  const segments: string[] = []
  const areas: string[] = []
  let run: number[] = []
  const flush = () => {
    if (run.length > 1) {
      const line = run.map((i, j) => `${j ? 'L' : 'M'}${x(i).toFixed(2)},${y(points[i].value!).toFixed(2)}`).join(' ')
      segments.push(line)
      areas.push(`${line} L${x(run[run.length - 1]).toFixed(2)},100 L${x(run[0]).toFixed(2)},100 Z`)
    }
    run = []
  }
  points.forEach((p, i) => (p.value === null ? flush() : run.push(i)))
  flush()

  const defined = points.map((p, i) => (p.value === null ? -1 : i)).filter((i) => i >= 0)
  const last = defined[defined.length - 1]
  const shown = hover ?? last
  const isolated = defined.filter((i) => points[i - 1]?.value == null && points[i + 1]?.value == null)

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const target = Math.round(((e.clientX - r.left) / r.width) * (n - 1))
    // Snap to the nearest point that has data.
    let best: number | null = null
    for (const i of defined) if (best === null || Math.abs(i - target) < Math.abs(best - target)) best = i
    setHover(best)
  }

  const dot = (i: number, big: boolean) => (
    <span key={i} className={cx('line__dot', big && 'is-big')} style={{ left: `${x(i)}%`, top: `${y(points[i].value!)}%` }} />
  )

  return (
    <div className="line">
      <div className="line__ticks" aria-hidden>
        <span>100%</span>
        <span>50%</span>
        <span>0</span>
      </div>
      <div className="line__main">
        <div className="line__plot" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setHover(null)}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
            <line className="line__grid" x1="0" x2="100" y1="0" y2="0" vectorEffect="non-scaling-stroke" />
            <line className="line__grid" x1="0" x2="100" y1="50" y2="50" vectorEffect="non-scaling-stroke" />
            <line className="line__grid line__grid--base" x1="0" x2="100" y1="100" y2="100" vectorEffect="non-scaling-stroke" />
            {areas.map((d, i) => (
              <path key={i} className="line__area" d={d} />
            ))}
            {segments.map((d, i) => (
              <path key={i} className="line__path" d={d} vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
          {isolated.map((i) => dot(i, false))}
          {hover !== null && <span className="line__cross" style={{ left: `${x(hover)}%` }} />}
          {shown !== undefined && dot(shown, true)}
          {hover !== null && (
            <span className="tip" role="tooltip" style={{ left: `clamp(48px, ${x(hover)}%, calc(100% - 48px))` }}>
              <b>{format(points[hover].value!)}</b>
              <span>{points[hover].label}</span>
            </span>
          )}
        </div>
        <div className="line__axis" aria-hidden>
          <span>{points[0]?.label}</span>
          {n > 2 && <span>{points[Math.floor((n - 1) / 2)].label}</span>}
          {n > 1 && <span>{points[n - 1].label}</span>}
        </div>
      </div>
    </div>
  )
}

export interface HeatDatum {
  key: string
  label: string
  count: number
  future: boolean
}

/** Week columns, weekday rows; one hue, darker = more done. */
export function Heatmap({ cells, max, rowLabels, colLabels, format }: { cells: HeatDatum[]; max: number; rowLabels: string[]; colLabels: string[]; format: (n: number) => string }) {
  const [active, setActive] = useState<HeatDatum | null>(null)
  const level = (n: number) => (n <= 0 || max <= 0 ? 0 : Math.max(1, Math.ceil((n / max) * 4)))
  const cols = cells.length / 7
  return (
    <div className="heat">
      <div className="heat__body">
        <div className="heat__rows" aria-hidden>
          {rowLabels.map((l, i) => (
            <span key={i}>{i % 2 === 0 ? l : ''}</span>
          ))}
        </div>
        <div className="heat__main">
          <div className="heat__cols" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }} aria-hidden>
            {colLabels.map((l, i) => (
              <span key={i}>{l}</span>
            ))}
          </div>
          <div className="heat__grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }} onPointerLeave={() => setActive(null)}>
            {cells.map((c) =>
              c.future ? (
                <span key={c.key} className="heat__cell is-future" />
              ) : (
                <button
                  key={c.key}
                  type="button"
                  className={cx('heat__cell', `l${level(c.count)}`, active?.key === c.key && 'is-active')}
                  aria-label={`${c.label}: ${format(c.count)}`}
                  onPointerEnter={() => setActive(c)}
                  onFocus={() => setActive(c)}
                  onBlur={() => setActive(null)}
                  onClick={() => setActive(c)}
                />
              ),
            )}
          </div>
        </div>
      </div>
      <div className="heat__foot">
        <span className="heat__readout">{active ? `${active.label} — ${format(active.count)}` : ''}</span>
        <span className="heat__legend" aria-hidden>
          {[0, 1, 2, 3, 4].map((l) => (
            <i key={l} className={`heat__cell l${l}`} />
          ))}
        </span>
      </div>
    </div>
  )
}

/** A row of cells showing how consistently one habit was kept; null = nothing due. */
export function Strip({ cells }: { cells: (number | null)[] }) {
  return (
    <span className="strip" aria-hidden>
      {cells.map((v, i) => (
        <i key={i} className={cx(v === null && 'is-off')} style={v === null ? undefined : ({ '--v': v } as CSSProperties)} />
      ))}
    </span>
  )
}
