'use client'

import styles from './compass.module.css'
import type { ElementRef } from './stage-projection.ts'

type CompassProps = {
  rootRef: ElementRef
  needleRef: ElementRef
  onFaceNorth: () => void
}

export const Compass = (props: CompassProps) => (
  <button
    type='button'
    className={styles.compass}
    aria-label='Face north'
    data-show='0'
    ref={(el) => {
      props.rootRef.current = el
    }}
    onClick={props.onFaceNorth}
  >
    <svg
      viewBox='0 0 40 40'
      aria-hidden='true'
      ref={(el) => {
        props.needleRef.current = el
      }}
    >
      <polygon points='20,7 25.5,22 20,18.5 14.5,22' fill='#a8e8b0' />
      <polygon
        points='20,33 25.5,22 20,25.5 14.5,22'
        fill='rgba(168,232,176,.32)'
      />
    </svg>
  </button>
)
