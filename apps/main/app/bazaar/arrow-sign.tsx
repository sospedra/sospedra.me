'use client'

import cn from 'clsx'
import { prefersQuietFx } from 'services/theme'
import { DECO } from './decor'
import scene from './scene.module.css'
import { sfx } from './sounds'

type Side = 'left' | 'right'

type SignProps = { side: Side; index: number; m?: boolean }

/* the visible tree's floors in scroll order, street first */
const scrollAnchors = (section: Element) => {
  const scroller = section.closest('[data-bazaar-stage]')
  if (!scroller) return []
  return [...scroller.querySelectorAll<HTMLElement>('[data-floor]')].filter(
    (el) => el.offsetParent !== null,
  )
}

const scrollOneFloor = (button: HTMLElement, dir: 'up' | 'down') => {
  const section = button.closest('[data-floor]')
  if (!section) return
  const anchors = scrollAnchors(section)
  const index = anchors.indexOf(section as HTMLElement)
  if (index === -1) return
  const target = anchors[dir === 'up' ? index - 1 : index + 1]
  target?.scrollIntoView({
    behavior: prefersQuietFx() ? 'auto' : 'smooth',
    block: 'start',
  })
}

function ArrowSign(props: { dir: 'up' | 'down' } & SignProps) {
  const { dir, side, index, m } = props
  return (
    <button
      type='button'
      className={cn(
        scene.sign,
        side === 'left' ? scene.signL : scene.signR,
        m && scene.signM,
      )}
      data-dir={dir}
      data-edit-id={`sign-${dir}:${m ? 'm' : ''}${index}`}
      aria-label={dir === 'up' ? 'up one floor' : 'down one floor'}
      onClick={(event) => {
        sfx.click()
        scrollOneFloor(event.currentTarget, dir)
      }}
    >
      <img src={`${DECO}/${dir}-off.png`} alt='' draggable={false} />
      <span className={scene.signOn} aria-hidden>
        <img src={`${DECO}/${dir}-on.png`} alt='' draggable={false} />
      </span>
      <span className={scene.signHot} />
    </button>
  )
}

export function UpSign(props: SignProps) {
  return <ArrowSign dir='up' {...props} />
}

export function DownSign(props: SignProps) {
  return <ArrowSign dir='down' {...props} />
}
