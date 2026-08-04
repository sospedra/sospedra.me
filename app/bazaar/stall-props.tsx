import { GLOW_COLORS, STALL_PROPS, type StallProp } from './decor-manifest'
import { DECO } from './spawn-catalog'
import css from './stall-props.module.css'
import type { BazaarStallId } from './stalls-manifest'

const GLOW_Z = 2

const propStyle = (prop: StallProp): React.CSSProperties => ({
  left: `calc(var(--su) * ${prop.x})`,
  top: `calc(var(--su) * ${prop.y})`,
  height: `calc(var(--su) * ${prop.h})`,
  zIndex: prop.kind === 'glow' ? GLOW_Z : prop.z,
  filter: prop.bright === 1 ? undefined : `brightness(${prop.bright})`,
})

/** the stall's prop constellation; editable in place via data-edit-anchor */
export default function StallProps({ id }: { id: BazaarStallId }) {
  return (
    <>
      {STALL_PROPS[id].map((prop, index) => {
        const key = `${id}:${prop.ref}:${index}`
        if (prop.kind === 'deco') {
          return (
            <img
              key={key}
              src={`${DECO}/${prop.ref}.png`}
              alt=''
              draggable={false}
              loading='lazy'
              className={css.prop}
              data-edit-id={key}
              data-edit-anchor={id}
              style={propStyle(prop)}
            />
          )
        }
        return (
          <div
            key={key}
            aria-hidden
            className={css.prop}
            data-edit-id={key}
            data-edit-anchor={id}
            style={{
              ...propStyle(prop),
              width: `calc(var(--su) * ${prop.w})`,
              background: `radial-gradient(ellipse, ${GLOW_COLORS[prop.ref]} 0%, transparent 68%)`,
              mixBlendMode: 'screen',
            }}
          />
        )
      })}
    </>
  )
}
