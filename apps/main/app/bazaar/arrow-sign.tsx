import cn from 'clsx'
import { DECO } from './decor'
import scene from './scene.module.css'

type Side = 'left' | 'right'

type SignProps = { side: Side; index: number; m?: boolean }

function ArrowSign(props: { dir: 'up' | 'down' } & SignProps) {
  const { dir, side, index, m } = props
  return (
    <div
      className={cn(
        scene.sign,
        side === 'left' ? scene.signL : scene.signR,
        m && scene.signM,
      )}
      data-dir={dir}
      data-edit-id={`sign-${dir}:${m ? 'm' : ''}${index}`}
      aria-hidden
    >
      <img src={`${DECO}/${dir}-off.png`} alt='' draggable={false} />
      <img src={`${DECO}/${dir}-on.png`} alt='' draggable={false} data-on='' />
      <div className={scene.signHot} />
    </div>
  )
}

export function UpSign(props: SignProps) {
  return <ArrowSign dir='up' {...props} />
}

export function DownSign(props: SignProps) {
  return <ArrowSign dir='down' {...props} />
}
