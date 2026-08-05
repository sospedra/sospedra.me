'use client'

import { useStoreSelector } from 'services/external-store'
import styles from './cims.module.css'
import type { CimsStore } from './cims-store.ts'
import type { ElementRef } from './stage-projection.ts'
import { seqText } from './tour-copy.ts'

type TelemetryHudProps = {
  store: CimsStore
  mountainCount: number | null
  altRef: ElementRef
  spdRef: ElementRef
  hdgRef: ElementRef
}

export const TelemetryHud = (props: TelemetryHudProps) => {
  const seq = useStoreSelector(props.store, (snap) =>
    props.mountainCount === null ? '01/12' : seqText(snap, props.mountainCount),
  )
  return (
    <div className={styles.telemetry}>
      <div>
        <b>alt</b>
        <span
          ref={(el) => {
            props.altRef.current = el
          }}
        >
          00000
        </span>{' '}
        m
      </div>
      <div>
        <b>spd</b>
        <span
          ref={(el) => {
            props.spdRef.current = el
          }}
        >
          00000
        </span>
      </div>
      <div>
        <b>hdg</b>
        <span
          ref={(el) => {
            props.hdgRef.current = el
          }}
        >
          000
        </span>
        °
      </div>
      <div>
        <b>seq</b>
        <span>{seq}</span>
      </div>
    </div>
  )
}
