'use client'

import { createPortal } from 'react-dom'
import { GLOW_COLORS } from './decor-manifest'
import { ARCH, DECO, type SpawnItem } from './spawn-catalog'
import { targetHost } from './stage-probe'

const baseStyle = (item: SpawnItem): React.CSSProperties => ({
  position: 'absolute',
  left: `calc(var(--su) * ${item.x})`,
  top: `calc(var(--su) * ${item.y})`,
  zIndex: item.z,
  pointerEvents: 'none',
})

function SpawnNode({ item }: { item: SpawnItem }) {
  if (item.kind === 'deco' || item.kind === 'arch') {
    const base = item.kind === 'arch' ? ARCH : DECO
    return (
      <img
        src={`${base}/${item.ref}.png`}
        alt=''
        draggable={false}
        data-edit-id={item.key}
        data-edit-spawn={`${item.kind}:${item.ref}`}
        style={{
          ...baseStyle(item),
          height: `calc(var(--su) * ${item.h})`,
          imageRendering: 'pixelated',
        }}
      />
    )
  }
  return (
    <div
      aria-hidden
      data-edit-id={item.key}
      data-edit-spawn={`${item.kind}:${item.ref}`}
      style={{
        ...baseStyle(item),
        width: `calc(var(--su) * ${item.w})`,
        height: `calc(var(--su) * ${item.h})`,
        background: `radial-gradient(ellipse, ${GLOW_COLORS[item.ref]} 0%, transparent 68%)`,
        mixBlendMode: item.kind === 'shadow' ? 'multiply' : 'screen',
      }}
    />
  )
}

/* spawned items render with the editor off too: toggle to preview clean */
export default function SpawnLayer({ items }: { items: SpawnItem[] }) {
  return (
    <>
      {items.map((item) => {
        const host = targetHost(item.target)
        if (!host) return null
        return createPortal(<SpawnNode item={item} />, host, item.key)
      })}
    </>
  )
}
