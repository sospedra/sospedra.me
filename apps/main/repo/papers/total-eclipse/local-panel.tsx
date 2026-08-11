'use client'

import cn from 'clsx'
import type React from 'react'
import type { EclipseCountry } from './eclipse-countries.ts'
import chrome from './figure.module.css'
import {
  compassPoint,
  formatAltitude,
  formatClock,
  formatCoordinates,
  formatDuration,
  formatObscuration,
  horizonAdvice,
  zoneAbbreviation,
} from './local-format.ts'
import css from './local-panel.module.css'

import type { Circumstances } from './shadow-engine.ts'
import type { BandDistance } from './umbra-field.ts'

const Row: React.FC<{ label: string; value: string }> = (props) => (
  <div className={chrome.stat}>
    <span className={chrome.statKey}>{props.label}</span>
    <span className={chrome.statValue}>{props.value}</span>
  </div>
)

const verdictOf = (circumstances: Circumstances): string => {
  if (circumstances.totality) {
    return `Inside the band. ${formatDuration(circumstances.totality.seconds)} with the glasses off.`
  }
  if (circumstances.maxObscuration <= 0) return 'The shadow never reaches here.'
  return 'Outside the band. The glasses never come off, and the corona never shows.'
}

const Timings: React.FC<{
  circumstances: Circumstances
  zone: string
}> = (props) => {
  const timeline = props.circumstances.timeline
  if (!timeline) return null
  const { zone } = props
  return (
    <div>
      <Row
        label='First contact'
        value={formatClock(timeline.firstContact, zone)}
      />
      <Row label='Maximum' value={formatClock(timeline.maximum, zone)} />
      <Row
        label='Last contact'
        value={formatClock(timeline.lastContact, zone)}
      />
      <Row
        label='Totality'
        value={
          props.circumstances.totality
            ? formatDuration(props.circumstances.totality.seconds)
            : 'none'
        }
      />
      <Row
        label='Sun at maximum'
        value={`${formatAltitude(timeline.sunAltitude)} · ${compassPoint(timeline.sunAzimuth)}`}
      />
    </div>
  )
}

const DriveNote: React.FC<{
  drive: BandDistance | null
  refuge: { name: string; country: string; km: number } | null
}> = (props) => {
  const { drive } = props
  if (!drive) return null
  return (
    <p className={css.drive}>
      <span className={css.driveKey}>The drive</span>
      {`${Math.round(drive.km)} km ${drive.compass} buys one minute of totality. The center line sits ${Math.round(drive.centerKm)} km out and pays ${formatDuration(drive.centerSeconds)}.`}
      {props.refuge
        ? ` Nearest sure thing: ${props.refuge.name}, ${Math.round(props.refuge.km)} km.`
        : null}
    </p>
  )
}

type PanelSite = {
  name: string | null
  latitude: number
  longitude: number
}

const LocalPanel: React.FC<{
  country: EclipseCountry
  site: PanelSite
  zone: string
  circumstances: Circumstances
  drive: BandDistance | null
  refuge: { name: string; country: string; km: number } | null
  children: React.ReactNode
}> = (props) => {
  const { circumstances, zone } = props
  const timeline = circumstances.timeline
  const total = Boolean(circumstances.totality)

  return (
    <div className={css.panel}>
      <div>
        <p className={css.place}>
          {props.site.name ??
            formatCoordinates(props.site.latitude, props.site.longitude)}
        </p>
        <p className={css.coords}>
          {props.site.name
            ? formatCoordinates(props.site.latitude, props.site.longitude)
            : `open ground in ${props.country.name}`}
        </p>
      </div>

      <div>
        <p className={css.readoutLabel}>Maximum obscuration</p>
        <p className={cn(css.readout, total && css.readoutTotal)}>
          {formatObscuration(circumstances.maxObscuration)}
        </p>
        <p className={cn(css.verdict, total && css.verdictTotal)}>
          {verdictOf(circumstances)}
        </p>
      </div>

      <Timings circumstances={circumstances} zone={zone} />

      <DriveNote drive={props.drive} refuge={props.refuge} />

      {props.children}

      {timeline ? (
        <p className={chrome.note}>
          {`Clocks in ${zoneAbbreviation(zone)}. ${horizonAdvice(timeline.sunAltitude)} No lunar limb profile is applied, so a spot on the band edge can differ by a few seconds.`}
        </p>
      ) : null}
    </div>
  )
}

export default LocalPanel
