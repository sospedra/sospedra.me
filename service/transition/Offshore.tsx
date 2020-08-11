import React, { useState, useEffect, useRef } from 'react'
import { SpriteCloud } from 'components/Sprite/Mountain'
import { useTransition } from './context'
import css from './offshore.module.css'

const Cloud: React.FC<{ duration?: number }> = (props) => {
  const { setOffshore } = useTransition()
  const cloud = useRef<HTMLDivElement>(null)
  const clean = () => setOffshore('')
  const style: {} = props.duration
    ? { animationDuration: `${props.duration}ms` }
    : {}

  useEffect(() => {
    if (cloud.current) {
      cloud.current.addEventListener('animationend', clean)
      return () => {
        cloud.current?.removeEventListener('animationend', clean)
      }
    }
  }, [cloud])

  return (
    <aside ref={cloud} className={css.cloud} style={style}>
      <SpriteCloud />
    </aside>
  )
}

const selectOffshore = (offshore: string, offshoreDuration?: number) => {
  switch (offshore) {
    case 'cloud':
      return <Cloud duration={offshoreDuration} />
    default:
      return null
  }
}

const Offshore: React.FC<{}> = () => {
  const { offshore, offshoreDuration } = useTransition()
  const [OffshoreElement, setOffshoreElement] = useState<JSX.Element | null>(
    selectOffshore(offshore, offshoreDuration),
  )

  useEffect(() => {
    setOffshoreElement(selectOffshore(offshore, offshoreDuration))
  }, [offshore])

  return OffshoreElement
}

export default Offshore
