import { SpriteCloud } from 'components/Sprite/Mountain'
import type React from 'react'
import { useEffect, useRef } from 'react'
import { useTheme } from 'service/theme'
import { useTransition } from './context'
import css from './offshore.module.css'

const Cloud: React.FC<{ duration?: number }> = (props) => {
  const { setOffshore } = useTransition()
  const { fxMode } = useTheme()
  const cloud = useRef<HTMLDivElement>(null)
  const style: React.CSSProperties = props.duration
    ? ({ '--cloud-duration': `${props.duration}ms` } as React.CSSProperties)
    : {}

  useEffect(() => {
    const node = cloud.current
    if (!node) return
    const clean = () => setOffshore('')
    if (fxMode === 'quiet') {
      clean()
      return
    }
    node.addEventListener('animationend', clean)
    return () => {
      node.removeEventListener('animationend', clean)
    }
  }, [fxMode, setOffshore])

  return (
    <aside ref={cloud} aria-hidden='true' className={css.cloud} style={style}>
      <SpriteCloud />
    </aside>
  )
}

const Offshore: React.FC = () => {
  const { offshore, offshoreDuration } = useTransition()

  switch (offshore) {
    case 'cloud':
      return <Cloud duration={offshoreDuration} />
    default:
      return null
  }
}

export default Offshore
