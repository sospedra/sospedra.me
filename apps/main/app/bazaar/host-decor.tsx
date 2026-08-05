'use client'

import cn from 'clsx'
import { useStoreSelector } from 'services/external-store'
import {
  type Corner,
  type DecorHost,
  type DecorNode,
  type DecorVariant,
  GLOW_COLORS,
  indexNodes,
  isSpotKind,
  type NodeIndex,
  type Placement,
  type Regime,
  rootCornerOf,
  rootHostOf,
  spriteSrc,
  variantsOf,
} from './decor'
import css from './decor.module.css'
import { decorStore } from './decor-store'
import { DIMS } from './stall-catalog'
import type { BazaarStallId } from './stalls-manifest'

const HIDE_CLASS: Record<Regime, string> = {
  m: css.hm,
  b: css.hb,
  a: css.ha,
  w: css.hw,
}

const CORNER_X: Record<Corner, 'left' | 'right'> = {
  tl: 'left',
  bl: 'left',
  tr: 'right',
  br: 'right',
}

const CORNER_Y: Record<Corner, 'top' | 'bottom'> = {
  tl: 'top',
  tr: 'top',
  bl: 'bottom',
  br: 'bottom',
}

type Dims = { width: number; height: number }

/* stall boxes convert su to percent so props ride the mobile-sized wrap;
   every other host resolves its own unit variable in place */
type Space = { unit: 'stall'; dims: Dims } | { unit: 'su' } | { unit: 'mu' }

const spaceOf = (host: DecorHost): Space => {
  if (host.startsWith('stall:')) {
    return { unit: 'stall', dims: DIMS[host.slice(6) as BazaarStallId] }
  }
  if (host.startsWith('mfloor:') || host.startsWith('sm:')) {
    return { unit: 'mu' }
  }
  return { unit: 'su' }
}

const lengthX = (space: Space, value: number) => {
  if (space.unit === 'stall') return `${(value / space.dims.width) * 100}%`
  if (space.unit === 'mu') return `calc(var(--mfloor-h) / 597 * ${value})`
  return `calc(var(--su) * ${value})`
}

const lengthY = (space: Space, value: number) => {
  if (space.unit === 'stall') return `${(value / space.dims.height) * 100}%`
  return lengthX(space, value)
}

const scaleOf = (node: DecorNode, place: Placement) => {
  const sx = (place.sx ?? 1) * (node.flip ? -1 : 1)
  const sy = place.sy ?? 1
  if (sx === 1 && sy === 1) return {}
  return { scale: `${sx} ${sy}`, transformOrigin: 'bottom center' }
}

const variantStyle = (
  node: DecorNode,
  corner: Corner,
  place: Placement,
  space: Space,
): React.CSSProperties => ({
  [CORNER_X[corner]]: lengthX(space, place.x),
  [CORNER_Y[corner]]: lengthY(space, place.y),
  height: lengthY(space, place.h),
  zIndex: node.z,
  filter: node.bright === undefined ? undefined : `brightness(${node.bright})`,
  opacity: node.opacity,
  ...scaleOf(node, place),
})

function Variant(props: {
  node: DecorNode
  corner: Corner
  variant: DecorVariant
  space: Space
}) {
  const { node, corner, variant, space } = props
  const className = cn(
    css.node,
    ...variant.hiddenIn.map((regime) => HIDE_CLASS[regime]),
  )
  const style = variantStyle(node, corner, variant.place, space)
  if (isSpotKind(node.kind)) {
    return (
      <div
        aria-hidden
        className={className}
        data-edit-id={node.id}
        style={{
          ...style,
          width: lengthX(space, variant.place.w ?? variant.place.h),
          background: `radial-gradient(ellipse, ${GLOW_COLORS[node.ref]} 0%, transparent 68%)`,
          mixBlendMode: node.kind === 'shadow' ? 'multiply' : 'screen',
        }}
      />
    )
  }
  return (
    <img
      src={spriteSrc(node.kind, node.ref)}
      alt=''
      draggable={false}
      loading='lazy'
      className={className}
      data-edit-id={node.id}
      style={style}
    />
  )
}

function NodeView({ node, byId }: { node: DecorNode; byId: NodeIndex }) {
  const corner = rootCornerOf(byId, node)
  const space = spaceOf(rootHostOf(byId, node))
  return variantsOf(byId, node).map((variant) => (
    <Variant
      key={`${node.id}:${variant.regimes.join('')}`}
      node={node}
      corner={corner}
      variant={variant}
      space={space}
    />
  ))
}

/** every decor node whose anchor chain roots in this layout box */
export default function HostDecor({ host }: { host: DecorHost }) {
  const doc = useStoreSelector(decorStore, (value) => value)
  const byId = indexNodes(doc)
  const nodes = doc.nodes.filter((node) => rootHostOf(byId, node) === host)
  return nodes.map((node) => <NodeView key={node.id} node={node} byId={byId} />)
}
