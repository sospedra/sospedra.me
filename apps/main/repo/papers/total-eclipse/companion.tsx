'use client'

import type React from 'react'
import { useEffect, useMemo, useState } from 'react'
import AreaPicker from './area-picker.tsx'
import css from './companion.module.css'
import {
  type CompanionMoment,
  type CompanionPhase,
  formatCountdown,
  momentOf,
  phasesFor,
} from './companion-phases.ts'
import shadow from './data/shadow.json'
import chrome from './figure.module.css'
import {
  ECLIPSE_DAY_UTC,
  formatClock,
  formatDuration,
  formatObscuration,
  zoneAbbreviation,
} from './local-format.ts'
import { resolveFromIp, useEclipseLocation } from './location-store.ts'
import { createShadowEngine } from './shadow-engine.ts'

const engine = createShadowEngine(shadow.b64)

const nowSeconds = () => (Date.now() - ECLIPSE_DAY_UTC) / 1000

const GlassesChip: React.FC<{ glasses: 'on' | 'off' }> = (props) => (
  <span className={css.glasses} data-state={props.glasses}>
    {props.glasses === 'off' ? 'glasses off · look up' : 'glasses on'}
  </span>
)

const PhaseStrip: React.FC<{
  phases: CompanionPhase[]
  activeId: string | null
}> = (props) => (
  <ol className={css.strip}>
    {props.phases.map((phase) => (
      <li
        className={css.stripItem}
        data-active={phase.id === props.activeId}
        data-off={phase.glasses === 'off'}
        key={phase.id}
      >
        {phase.name}
      </li>
    ))}
  </ol>
)

const Nowhere: React.FC = () => (
  <div className={css.stage}>
    <p className={css.phaseName}>The shadow never reaches here</p>
    <p className={css.instruction}>
      Pick a country above, or tap the map in the figure before this one. The
      nine countries the eclipse touches all have a plan waiting.
    </p>
  </div>
)

const After: React.FC = () => (
  <div className={css.stage}>
    <p className={css.phaseName}>It is over</p>
    <p className={css.instruction}>
      Spain holds a rematch on 2 August 2027, longer and higher in the sky, and
      an annular on 26 January 2028. Tonight the Perseids peak under a
      guaranteed new moon. Stay out.
    </p>
  </div>
)

const Before: React.FC<{
  moment: Extract<CompanionMoment, { kind: 'before' }>
  summary: string
  zone: string
}> = (props) => (
  <div className={css.stage}>
    <p className={css.kicker}>first contact in</p>
    <p className={css.countdown}>
      {formatCountdown(props.moment.secondsToFirst)}
    </p>
    <p className={css.instruction}>
      {`${props.summary} First contact at ${formatClock(props.moment.first.start, props.zone)} ${zoneAbbreviation(props.zone)}. Glasses ready: nothing before totality is safe without them.`}
    </p>
  </div>
)

const During: React.FC<{
  moment: Extract<CompanionMoment, { kind: 'during' }>
}> = (props) => (
  <div
    className={css.stage}
    data-off={props.moment.phase.glasses === 'off'}
    key={props.moment.phase.id}
  >
    <GlassesChip glasses={props.moment.phase.glasses} />
    <p className={css.phaseName}>{props.moment.phase.name}</p>
    <p className={css.instruction}>{props.moment.phase.instruction}</p>
    <p className={css.nextLine}>
      <span className={css.countdownSmall}>
        {formatCountdown(props.moment.secondsLeft)}
      </span>
      {props.moment.next
        ? ` to ${props.moment.next.name.toLowerCase()}`
        : ' left'}
    </p>
  </div>
)

const COMPANION_VIEW: Record<
  Exclude<CompanionMoment['kind'], 'before' | 'during'>,
  React.ReactNode
> = {
  nowhere: <Nowhere />,
  after: <After />,
}

type SimSpan = { start: number; end: number }

const SimRow: React.FC<{
  span: SimSpan
  simulated: number | null
  onChange: (seconds: number | null) => void
}> = (props) => {
  const { span, simulated } = props
  const position =
    simulated === null
      ? 0
      : Math.round(((simulated - span.start) / (span.end - span.start)) * 1000)
  return (
    <div className={css.simRow}>
      <input
        aria-label='Preview the evening'
        className={css.simRange}
        max={1000}
        min={0}
        onChange={(event) =>
          props.onChange(
            span.start +
              ((span.end - span.start) * Number(event.target.value)) / 1000,
          )
        }
        type='range'
        value={position}
      />
      <button
        className={chrome.nav}
        onClick={() => props.onChange(null)}
        type='button'
      >
        {simulated === null ? 'live' : 'back to live'}
      </button>
    </div>
  )
}

const MomentView: React.FC<{
  moment: CompanionMoment
  summary: string
  zone: string
}> = (props) => {
  const { moment } = props
  if (moment.kind === 'before') {
    return <Before moment={moment} summary={props.summary} zone={props.zone} />
  }
  if (moment.kind === 'during') return <During moment={moment} />
  return COMPANION_VIEW[moment.kind]
}

const SyncingStage: React.FC<{ summary: string }> = (props) => (
  <div className={css.stage}>
    <p className={css.kicker}>syncing your clock</p>
    <p className={css.instruction}>{props.summary}</p>
  </div>
)

const Companion: React.FC = () => {
  const location = useEclipseLocation()
  // cacheComponents rejects Date.now() during prerender, so the clock starts on mount
  const [liveNow, setLiveNow] = useState(0)
  const [simulated, setSimulated] = useState<number | null>(null)

  useEffect(() => {
    resolveFromIp()
    setLiveNow(nowSeconds())
    const interval = window.setInterval(() => setLiveNow(nowSeconds()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  const circumstances = useMemo(
    () => engine.circumstances(location.latitude, location.longitude),
    [location.latitude, location.longitude],
  )
  const phases = useMemo(() => phasesFor(circumstances), [circumstances])
  const moment = momentOf(phases, simulated ?? liveNow)

  const summary = circumstances.totality
    ? `This spot gets ${formatDuration(circumstances.totality.seconds)} of totality.`
    : `This spot tops out at ${formatObscuration(circumstances.maxObscuration)} covered, glasses on throughout.`

  const simSpan = phases.length
    ? {
        start: phases[0].start - 1800,
        end: phases[phases.length - 1].end + 600,
      }
    : null

  const activeId =
    moment !== null && moment.kind === 'during' ? moment.phase.id : null

  return (
    <section className={chrome.figure}>
      <div className={chrome.card}>
        <div className={chrome.head}>
          <span className={chrome.label}>fig 05 · the companion</span>
          <AreaPicker />
        </div>

        <div className={chrome.body}>
          <p className={chrome.brief}>
            Load this page before you leave: the band will have no signal, and
            everything here runs offline. The companion tracks the clock at your
            spot and tells you the one thing that matters in each phase,
            including the only two minutes when the glasses come off.
          </p>

          {moment === null ? (
            <SyncingStage summary={summary} />
          ) : (
            <MomentView
              moment={moment}
              summary={summary}
              zone={location.zone}
            />
          )}

          {phases.length > 0 ? (
            <PhaseStrip activeId={activeId} phases={phases} />
          ) : null}

          {simSpan ? (
            <SimRow
              onChange={setSimulated}
              simulated={simulated}
              span={simSpan}
            />
          ) : null}

          <p className={chrome.note}>
            {`Clocks in ${zoneAbbreviation(location.zone)}. Drag the slider to preview the evening; live mode follows your clock. Times come from the same geometry as every figure above, for ${location.label ?? 'your pick'}.`}
          </p>
        </div>
      </div>
    </section>
  )
}

export default Companion
