import React, { useEffect, useRef } from 'react'
import { SpriteCloud } from 'components/Sprite/Mountain'
import { useTransition } from './context'
import css from './offshore.module.css'

const Cloud: React.FC<{ duration?: number }> = (props) => {
  const { setOffshore } = useTransition()
  const cloud = useRef<HTMLDivElement>(null)
  const style: React.CSSProperties = props.duration
    ? { animationDuration: `${props.duration}ms` }
    : {}

  useEffect(() => {
    const node = cloud.current
    if (!node) return
    const clean = () => setOffshore('')
    node.addEventListener('animationend', clean)
    return () => {
      node.removeEventListener('animationend', clean)
    }
  }, [])

  return (
    <aside ref={cloud} className={css.cloud} style={style}>
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
