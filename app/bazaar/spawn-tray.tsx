'use client'

import { useState } from 'react'
import { DECO_INVENTORY } from './deco-inventory'
import { GLOW_COLORS } from './decor-manifest'
import scene from './layout-editor.module.css'
import {
  ARCH,
  ARCH_INVENTORY,
  DECO,
  GLOW_KEYS,
  type SpawnKind,
} from './spawn-catalog'

function SpawnCell({
  id,
  kind,
  spawn,
}: {
  id: string
  kind: SpawnKind
  spawn: (kind: SpawnKind, ref: string) => void
}) {
  const base = kind === 'arch' ? ARCH : DECO
  return (
    <button
      type='button'
      title={`${id} — spawns at viewport center`}
      style={{
        padding: 3,
        background: kind === 'arch' ? '#1b2214' : '#141827',
        border: '1px solid #333',
        cursor: 'pointer',
        color: '#8b93a2',
      }}
      onClick={() => spawn(kind, id)}
    >
      <img
        src={`${base}/${id}.png`}
        alt={id}
        loading='lazy'
        style={{
          width: '100%',
          height: 72,
          objectFit: 'contain',
        }}
      />
      <div
        style={{
          fontSize: 9,
          lineHeight: '11px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {id}
      </div>
    </button>
  )
}

export default function SpawnTray({
  spawn,
}: {
  spawn: (kind: SpawnKind, ref: string) => void
}) {
  const [showList, setShowList] = useState(true)
  const [filter, setFilter] = useState('')

  const shownArch = ARCH_INVENTORY.filter((id) => id.includes(filter))
  const shownProps = DECO_INVENTORY.filter((id) => id.includes(filter))

  return (
    <>
      <div className={scene.editPanelRow} style={{ marginTop: 8 }}>
        {GLOW_KEYS.map((key) => (
          <button
            key={key}
            type='button'
            title={`glow ${key} — spawns at viewport center`}
            style={{
              width: 24,
              height: 24,
              background: GLOW_COLORS[key],
              border: '1px solid #444',
            }}
            onClick={() => spawn('glow', key)}
          />
        ))}
        <button
          type='button'
          title='shadow — spawns at viewport center'
          style={{
            width: 24,
            height: 24,
            background: '#000',
            border: '1px solid #444',
          }}
          onClick={() => spawn('shadow', 'black')}
        />
        <button type='button' onClick={() => setShowList((v) => !v)}>
          {showList ? 'props ▴' : 'props ▾'}
        </button>
      </div>
      {showList && (
        <>
          <input
            value={filter}
            placeholder='filter props…'
            onChange={(e) => setFilter(e.target.value)}
            style={{
              width: '100%',
              margin: '4px 0',
              padding: '3px 6px',
              background: '#06070d',
              border: '1px solid #444',
              color: '#cfd3d8',
              font: 'inherit',
            }}
          />
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 5,
              maxHeight: 420,
              overflowY: 'auto',
            }}
          >
            {shownArch.map((id) => (
              <SpawnCell key={id} id={id} kind='arch' spawn={spawn} />
            ))}
            {shownProps.map((id) => (
              <SpawnCell key={id} id={id} kind='deco' spawn={spawn} />
            ))}
          </div>
        </>
      )}
    </>
  )
}
