import type { LifeState } from './engine'
import {
  formatCount,
  METER_SEGMENTS,
  meterLevel,
  Screw,
} from './life-instruments'
import css from './population-pod.module.css'

const tracePoints = (history: readonly number[]) => {
  if (history.length < 2) return '0,22 100,22'
  const high = Math.max(...history, 1)
  return history
    .map((value, index) => {
      const x = (index / (history.length - 1)) * 100
      const y = 38 - (value / high) * 34
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

const PopulationTrace = ({ history }: { history: readonly number[] }) => (
  <svg
    className={css.scopeTrace}
    viewBox='0 0 100 42'
    preserveAspectRatio='none'
    aria-hidden='true'
  >
    <path d='M0 38H100M0 21H100M0 4H100' />
    <polyline points={tracePoints(history)} />
  </svg>
)

export const PopulationPod = ({ state }: { state: LifeState }) => {
  const signalLevel = meterLevel(state.cells.size)

  return (
    <aside
      className={`${css.instrumentPod} ${css.populationPod}`}
      aria-label='Population telemetry'
    >
      <Screw position='ne' />
      <Screw position='sw' />
      <span className={css.instrumentLabel}>Bio signal</span>
      <div className={css.populationReadout}>
        <span>Population</span>
        <strong>{formatCount(state.cells.size)}</strong>
      </div>
      <div className={css.signalBank} aria-hidden='true'>
        {METER_SEGMENTS.map((segment, index) => (
          <i key={segment} data-on={index < signalLevel ? 'true' : 'false'} />
        ))}
      </div>
      <dl className={css.deltaReadout}>
        <div>
          <dt>Born</dt>
          <dd>+{formatCount(state.birthsCount)}</dd>
        </div>
        <div>
          <dt>Lost</dt>
          <dd>−{formatCount(state.deathsCount)}</dd>
        </div>
      </dl>
      <div className={css.scope}>
        <PopulationTrace history={state.history} />
      </div>
    </aside>
  )
}
