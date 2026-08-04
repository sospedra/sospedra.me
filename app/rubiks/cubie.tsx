import type React from 'react'
import {
  axisOf,
  FACE_NORMAL,
  FACES,
  type Face,
  type Stickers,
  slotIndex,
  type Vec,
} from './engine'
import css from './rubiks.module.css'

// official brand stickers, same hexes as the /about word animation
const FACE_COLOR: Record<Face, string> = {
  U: '#f2f6ff',
  D: '#ffd500',
  F: '#009b48',
  B: '#0046ad',
  R: '#b71234',
  L: '#ff5800',
}

const FACE_PLACE: Record<Face, string> = {
  F: '',
  B: 'rotateY(180deg)',
  R: 'rotateY(90deg)',
  L: 'rotateY(-90deg)',
  U: 'rotateX(90deg)',
  D: 'rotateX(-90deg)',
}

const cubiePlace = ([x, y, z]: Vec) =>
  `translate3d(calc(${x} * var(--cubie)), calc(${-y} * var(--cubie)), calc(${z} * var(--cubie)))`

export const Cubie: React.FC<{
  position: Vec
  stickers: Stickers
}> = ({ position, stickers }) => {
  return (
    <div className={css.cubie} style={{ transform: cubiePlace(position) }}>
      {FACES.map((face) => {
        const normal = FACE_NORMAL[face]
        const axis = axisOf(normal)
        const outward = position[axis] === normal[axis]
        // interior tiles inset 1px: exactly coplanar neighbor tiles trip
        // the preserve-3d compositor on first paint (dark notches)
        if (!outward) {
          return (
            <div
              key={face}
              className={css.plastic}
              style={{
                transform: `${FACE_PLACE[face]} translateZ(calc(var(--half) - 1px))`,
              }}
            />
          )
        }
        const color = stickers[slotIndex(position, normal)]
        return (
          <div
            key={face}
            className={css.sticker}
            data-face={face}
            style={
              {
                transform: `${FACE_PLACE[face]} translateZ(var(--half))`,
                '--tint': FACE_COLOR[color],
              } as React.CSSProperties
            }
          />
        )
      })}
    </div>
  )
}
