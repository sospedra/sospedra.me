import { NextPage } from 'next'
import css from './manual.module.css'
import Shell from 'components/Shell'
import SpriteBust from 'components/Sprite/Bust'
import SpriteManual from 'components/Sprite/Manual'
import Link from 'components/Link'

export const MANUAL_DESC =
  'How to work with Rubén Sospedra. A manual of instructions. What I value, how I look at problems, what are my blind spots, and how to build trust with me.'

const PICTO_HEIGHT = { style: { height: '30%' } }
const Pictogram: React.FC<{
  left: React.ReactNode
  right: React.ReactNode
  style?: React.CSSProperties
}> = ({ left, right, style = {} }) => {
  return (
    <div
      className='flex flex-row items-center w-full my-4 border border-current rounded-lg'
      style={style}
    >
      <div className='flex items-center justify-center flex-1 h-full'>
        {left}
      </div>
      <div className='flex items-center justify-center flex-1 h-full'>
        {right}
      </div>
    </div>
  )
}

const Manual: NextPage<{}> = () => {
  return (
    <Shell
      canonical='/manual'
      className='relative w-full max-w-2xl min-h-full px-4 pt-12 pb-20 mx-auto mb-12'
      description={MANUAL_DESC}
      title='Manual of instructions'
    >
      <section className={css.page}>
        <h1 className={css.title} aria-label='Sospedra'>
          <span>SOS</span>
          <span>PE</span>
          <span>DRA</span>
        </h1>
        <div className={css.bust}>
          <SpriteBust />
        </div>
        <img src='/sospedra.png' className={css.logo} />
      </section>
      <section className={css.page}>
        <div className='flex flex-row' {...PICTO_HEIGHT}>
          <SpriteManual name='support' />
          <Pictogram
            left={<SpriteManual name='gameboy' className='p-8' />}
            right={<SpriteManual name='handshake' className='p-8' />}
          />
        </div>
        <Pictogram
          {...PICTO_HEIGHT}
          left={<SpriteManual name='lost' />}
          right={
            <Link url='/' className='h-full'>
              <SpriteManual name='home' />
            </Link>
          }
        />
      </section>
      <section className={css.page}>
        <div
          className='flex flex-row items-center justify-between'
          {...PICTO_HEIGHT}
        >
          <SpriteManual name='demons' />
          <SpriteManual name='mobius' />
          <SpriteManual name='triangle' />
        </div>
        <div
          className='flex flex-row items-center justify-between'
          {...PICTO_HEIGHT}
        >
          <SpriteManual name='insert' />
          <SpriteManual name='count' />
        </div>
      </section>
    </Shell>
  )
}

export default Manual
