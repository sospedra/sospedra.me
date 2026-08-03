import type React from 'react'
import { useEffect, useRef } from 'react'
import { useTheme } from 'services/theme'
import { SpriteCloud } from './cloud-sprite'
import { useRouteTransition } from './context'
import css from './offshore.module.css'

const Cloud: React.FC<{ duration?: number }> = (props) => {
  const { setOffshore } = useRouteTransition()
  const { fxMode } = useTheme()
  const cloud = useRef<HTMLDivElement>(null)
  const style = {
    '--cloud-duration': props.duration ? `${props.duration}ms` : undefined,
  } as React.CSSProperties

  useEffect(() => {
    if (fxMode !== 'quiet') return
    setOffshore(undefined)
  }, [fxMode, setOffshore])

  useEffect(() => {
    const node = cloud.current
    if (!node) return
    const clean = () => setOffshore(undefined)
    node.addEventListener('animationend', clean)
    return () => {
      node.removeEventListener('animationend', clean)
    }
  }, [setOffshore])

  return (
    <aside ref={cloud} aria-hidden='true' className={css.cloud} style={style}>
      <SpriteCloud />
    </aside>
  )
}

const Offshore: React.FC = () => {
  const { offshore, offshoreDuration } = useRouteTransition()
  if (offshore !== 'cloud') return null
  return <Cloud duration={offshoreDuration} />
}

export default Offshore
