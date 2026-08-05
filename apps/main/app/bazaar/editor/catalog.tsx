'use client'

import { useState } from 'react'
import { DECO_INVENTORY } from '../deco-inventory'
import type { DecorKind } from '../decor'
import { GLOW_COLORS, spriteSrc } from '../decor'
import { ARCH_INVENTORY, GLOW_KEYS } from './catalog-data'
import css from './lists.module.css'
import { dragSpawnStore } from './store'

type Shelf = 'deco' | 'arch' | 'light'

const SHELVES: { id: Shelf; label: string }[] = [
  { id: 'deco', label: 'PROPS' },
  { id: 'arch', label: 'ARCH' },
  { id: 'light', label: 'LIGHT' },
]

const grab = (kind: DecorKind, ref: string) => (event: React.PointerEvent) => {
  event.preventDefault()
  dragSpawnStore.set({
    kind,
    ref,
    startX: event.clientX,
    startY: event.clientY,
  })
}

function SpriteCell({ kind, id }: { kind: 'deco' | 'arch'; id: string }) {
  return (
    <button
      type='button'
      className={css.cell}
      title={`${id} — drag onto the scene`}
      onPointerDown={grab(kind, id)}
    >
      <img src={spriteSrc(kind, id)} alt='' loading='lazy' draggable={false} />
      <div className={css.cellName}>{id}</div>
    </button>
  )
}

function LightShelf() {
  return (
    <div className={css.swatchRow}>
      {GLOW_KEYS.map((key) => (
        <button
          key={key}
          type='button'
          className={css.swatch}
          title={`glow ${key} — drag onto the scene`}
          style={{ background: GLOW_COLORS[key] }}
          onPointerDown={grab('glow', key)}
        />
      ))}
      <button
        type='button'
        className={css.swatch}
        title='shadow — drag onto the scene'
        style={{ background: '#000' }}
        onPointerDown={grab('shadow', 'black')}
      />
    </div>
  )
}

export default function Catalog() {
  const [shelf, setShelf] = useState<Shelf>('deco')
  const [query, setQuery] = useState('')

  const inventory = shelf === 'arch' ? ARCH_INVENTORY : DECO_INVENTORY
  const shown = inventory.filter((id) => id.includes(query))

  return (
    <>
      <div className={css.kindTabs}>
        {SHELVES.map((entry) => (
          <button
            key={entry.id}
            type='button'
            className={css.shelfTab}
            data-on={shelf === entry.id || undefined}
            onClick={() => setShelf(entry.id)}
          >
            {entry.label}
          </button>
        ))}
      </div>
      {shelf === 'light' ? (
        <LightShelf />
      ) : (
        <>
          <input
            className={css.search}
            placeholder='filter sprites…'
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          <div className={css.cellGrid}>
            {shown.map((id) => (
              <SpriteCell
                key={id}
                kind={shelf === 'arch' ? 'arch' : 'deco'}
                id={id}
              />
            ))}
          </div>
        </>
      )}
      <p className={css.catalogHint}>
        drag onto the scene to place it there. a plain click drops at the stage
        center. the drop point picks the anchor: stall, stairs, sep, floor, or
        street.
      </p>
    </>
  )
}
