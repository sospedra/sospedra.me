import {
  GLOW_COLORS,
  type HideBelow,
  type ImageProp,
  STAIRS_PROPS,
  STALL_PROPS,
  type StallProp,
} from './decor-manifest'
import { ARCH, DECO } from './spawn-catalog'
import { DIMS } from './stall-catalog'
import css from './stall-props.module.css'
import type { BazaarStallId } from './stalls-manifest'

const GLOW_Z = 2

type Dims = { width: number; height: number }

/* percent of the stall box: identical px on desktop (wrap = su * dims),
   correct on mobile where the wrap is viewport-sized */
const propStyle = (prop: StallProp, dims: Dims): React.CSSProperties => ({
  left: `${(prop.x / dims.width) * 100}%`,
  top: `${(prop.y / dims.height) * 100}%`,
  height: `${(prop.h / dims.height) * 100}%`,
  zIndex: prop.kind === 'glow' ? GLOW_Z : prop.z,
  filter: prop.bright === 1 ? undefined : `brightness(${prop.bright})`,
})

const PROP_CLASS: Record<HideBelow, string> = {
  700: css.hideBelow700,
  1690: css.hideBelow1690,
}

const classOf = (prop: StallProp) =>
  prop.hideBelow ? PROP_CLASS[prop.hideBelow] : css.prop

const editAttrs = (prop: StallProp, key: string, anchor: string) => ({
  className: classOf(prop),
  'data-edit-id': key,
  'data-edit-anchor': anchor,
  'data-edit-hide-below': prop.hideBelow,
})

const srcOf = (prop: ImageProp) =>
  `${prop.kind === 'arch' ? ARCH : DECO}/${prop.ref}.png`

function DecoProp(props: { prop: ImageProp; dims: Dims; attrs: object }) {
  const { prop, dims, attrs } = props
  return (
    <img
      src={srcOf(prop)}
      alt=''
      draggable={false}
      loading='lazy'
      style={propStyle(prop, dims)}
      {...attrs}
    />
  )
}

function GlowProp(props: {
  prop: Extract<StallProp, { kind: 'glow' }>
  dims: Dims
  attrs: object
}) {
  const { prop, dims, attrs } = props
  return (
    <div
      aria-hidden
      style={{
        ...propStyle(prop, dims),
        width: `${(prop.w / dims.width) * 100}%`,
        background: `radial-gradient(ellipse, ${GLOW_COLORS[prop.ref]} 0%, transparent 68%)`,
        mixBlendMode: 'screen',
      }}
      {...attrs}
    />
  )
}

/** the stall's prop constellation; editable in place via data-edit-anchor */
export default function StallProps({ id }: { id: BazaarStallId }) {
  const dims = DIMS[id]
  return (
    <>
      {STALL_PROPS[id].map((prop, index) => {
        const key = `${id}:${prop.ref}:${index}`
        const attrs = editAttrs(prop, key, id)
        if (prop.kind === 'glow') {
          return <GlowProp key={key} prop={prop} dims={dims} attrs={attrs} />
        }
        return <DecoProp key={key} prop={prop} dims={dims} attrs={attrs} />
      })}
    </>
  )
}

/* su-sized, not percent: the stairs box never rescales like stall wraps */
const stairsStyle = (prop: ImageProp): React.CSSProperties => ({
  left: `calc(var(--su) * ${prop.x})`,
  top: `calc(var(--su) * ${prop.y})`,
  height: `calc(var(--su) * ${prop.h})`,
  zIndex: prop.z,
  filter: prop.bright === 1 ? undefined : `brightness(${prop.bright})`,
})

/** the props riding a floor's stairs box; see STAIRS_PROPS */
export function StairsProps({ floor }: { floor: number }) {
  const props = STAIRS_PROPS[floor]
  if (!props) return null
  return (
    <>
      {props.map((prop, index) => {
        const key = `stairs:${floor}:${prop.ref}:${index}`
        return (
          <img
            key={key}
            src={srcOf(prop)}
            alt=''
            draggable={false}
            loading='lazy'
            className={classOf(prop)}
            data-edit-id={key}
            data-edit-anchor={`stairs:${floor}`}
            data-edit-hide-below={prop.hideBelow}
            style={stairsStyle(prop)}
          />
        )
      })}
    </>
  )
}
