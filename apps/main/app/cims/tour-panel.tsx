'use client'

import { useEffect, useState } from 'react'
import { useStoreSelector } from 'services/external-store'
import { tapHaptic } from 'services/haptics'
import type { CimsStore } from './cims-store.ts'
import { padDigits } from './easing.ts'
import type { CimsEngine } from './engine.ts'
import styles from './panel.module.css'
import { captionText, stepTitle, type TourNames } from './tour-copy.ts'

const TYPE_INTERVAL_MS = 16

type TypedCaptionProps = { text: string; quiet: boolean }

const TypedCaption = ({ text, quiet }: TypedCaptionProps) => {
  const [shown, setShown] = useState(text)
  useEffect(() => {
    if (quiet) {
      setShown(text)
      return
    }
    setShown('')
    let visible = 0
    const timer = setInterval(() => {
      visible += 1
      setShown(text.slice(0, visible))
      if (visible >= text.length) clearInterval(timer)
    }, TYPE_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [text, quiet])
  return <div className={styles.caption}>{shown}</div>
}

type TourPanelProps = {
  store: CimsStore
  names: TourNames
  engine: CimsEngine | null
  quiet: boolean
}

export const TourPanel = ({ store, names, engine, quiet }: TourPanelProps) => {
  const snap = useStoreSelector(store, (value) => value)
  const activeDot = snap.target.kind === 'mountain' ? snap.target.index : -1

  const withClick = (action: (() => void) | undefined) => () => {
    if (!engine || !action) return
    engine.playClick()
    tapHaptic()
    action()
  }

  return (
    <div className={styles.panel}>
      <div className={styles.stepRow}>
        <button
          type='button'
          className={styles.btn}
          onClick={withClick(engine?.prev)}
        >
          prev
        </button>
        <span>
          {names.mountains.map((mountain, k) => (
            <button
              type='button'
              key={mountain.title}
              className={k === activeDot ? styles.dotOn : styles.dot}
              aria-label={`Fly to ${mountain.title}`}
              aria-current={k === activeDot ? 'true' : undefined}
              onClick={withClick(() => engine?.flyToMountain(k))}
            >
              {padDigits(k + 1, 2)}
            </button>
          ))}
        </span>
        <button
          type='button'
          className={styles.btn}
          onClick={withClick(engine?.next)}
        >
          next
        </button>
        <button
          type='button'
          className={snap.autoOn ? styles.btnOn : styles.btn}
          aria-pressed={snap.autoOn}
          onClick={withClick(engine?.toggleAuto)}
        >
          auto
        </button>
        <button
          type='button'
          className={styles.btn}
          aria-label='Surface mode'
          onClick={withClick(engine?.cycleSurface)}
        >
          {snap.surfaceMode}
        </button>
      </div>
      <div className={styles.stepTitle}>{stepTitle(snap, names)}</div>
      <TypedCaption text={captionText(snap, names)} quiet={quiet} />
      <div className={styles.exgRow}>
        <span>vert ×{snap.exaggeration.toFixed(2)}</span>
        <input
          type='range'
          className={styles.exgSlider}
          min={1}
          max={3}
          step={0.05}
          value={snap.exaggeration}
          aria-label='Vertical exaggeration'
          onChange={(event) =>
            engine?.setExaggeration(Number.parseFloat(event.target.value))
          }
        />
      </div>
    </div>
  )
}
