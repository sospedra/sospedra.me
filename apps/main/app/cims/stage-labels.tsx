'use client'

import { useStoreSelector } from 'services/external-store'
import type { CimsStore } from './cims-store.ts'
import type { CimsEngine } from './engine.ts'
import styles from './labels.module.css'
import type { StageRefs } from './stage-projection.ts'
import type { TourNames } from './tour-copy.ts'

const HIDDEN = { display: 'none' } as const

type StageLabelsProps = {
  store: CimsStore
  names: TourNames
  refs: StageRefs
  engine: CimsEngine | null
}

export const StageLabels = ({
  store,
  names,
  refs,
  engine,
}: StageLabelsProps) => {
  const peakLabels = useStoreSelector(store, (snap) => snap.peakLabels)

  const withClick = (action: () => void) => () => {
    if (!engine) return
    engine.playClick()
    action()
  }

  return (
    <>
      {refs.peaks.map((ref, i) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: positional two-slot pool, slot 0 is the hot peak
          key={i}
          className={i === 0 ? styles.peakHot : styles.peak}
          style={HIDDEN}
          ref={(el) => {
            ref.current = el
          }}
        >
          {peakLabels[i] ? (
            <>
              {peakLabels[i].name}
              <small>{peakLabels[i].elev} m</small>
            </>
          ) : null}
        </div>
      ))}
      {names.cities.map((city, i) => (
        <button
          type='button'
          key={city.name}
          className={styles.city}
          style={HIDDEN}
          ref={(el) => {
            refs.cities[i].current = el
          }}
          onClick={withClick(() => engine?.flyToCity(i))}
        >
          {city.name}
        </button>
      ))}
      {names.mountains.map((mountain, k) => (
        <button
          type='button'
          key={mountain.title}
          className={styles.dest}
          style={HIDDEN}
          ref={(el) => {
            refs.dests[k].current = el
          }}
          onClick={withClick(() => engine?.flyToMountain(k))}
        >
          {mountain.title}
        </button>
      ))}
      <div
        className={styles.sunBody}
        style={HIDDEN}
        aria-hidden='true'
        ref={(el) => {
          refs.sun.current = el
        }}
      >
        SOL
      </div>
      <div
        className={styles.moonBody}
        style={HIDDEN}
        aria-hidden='true'
        ref={(el) => {
          refs.moon.current = el
        }}
      >
        LLUNA
      </div>
    </>
  )
}
