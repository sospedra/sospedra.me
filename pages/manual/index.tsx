import { NextPage } from 'next'
import cn from 'classnames'
import Shell from 'components/Shell'
import SpriteBust from 'components/Sprite/Bust'
import SpriteManual from 'components/Sprite/Manual'
import Link from 'components/Link'
import css from './manual.module.css'

export const MANUAL_DESC =
  'How to work with Rubén Sospedra. A manual of instructions. What I value, how I look at problems, what are my blind spots, and how to build trust with me.'

const PICTO_HEIGHT = { style: { height: '30%' } }
const Pictogram: React.FC<{
  left: React.ReactNode
  right: React.ReactNode
  style?: React.CSSProperties
  willHide?: boolean
}> = ({ left, right, style = {}, willHide = false }) => {
  return (
    <div
      className='flex flex-row items-center w-full border border-current rounded-lg'
      style={style}
    >
      <div
        className={cn('flex items-center justify-center flex-1 h-full', {
          ['hidden sm:block']: willHide,
        })}
      >
        {left}
      </div>
      <div className='flex items-center justify-center flex-1 h-full'>
        {right}
      </div>
    </div>
  )
}

const Piece: React.FC<{ quantity: number; id: number }> = ({
  children,
  quantity,
  id,
}) => {
  return (
    <div className='flex flex-col items-center justify-center flex-1 h-full pr-4 md:p-4'>
      <div className='relative h-full'>
        {children}
        <div
          className='absolute'
          style={{
            bottom: '1rem',
            right: '-1rem',
            writingMode: 'vertical-lr',
          }}
        >
          {id}
        </div>
      </div>
      <span className='font-bold'>{quantity}x</span>
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
      <section className={cn(css.page, 'justify-start pt-12')}>
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
            willHide
            left={<SpriteManual name='gameboy' className='p-8' />}
            right={<SpriteManual name='handshake' className='p-8' />}
          />
        </div>
        <Pictogram
          {...PICTO_HEIGHT}
          left={<SpriteManual name='lost' />}
          right={
            <Link url='/' className={css.home}>
              <SpriteManual name='home' />
            </Link>
          }
        />
        <div className='flex flex-row' style={{ height: '35%' }}>
          <div className='flex-1'>
            <p>
              <b>WARNING</b>
            </p>
            <p>
              Serious or fatal crushing injuries can occur from furniture
              tip-over. To prevent this furniture from tipping over it must be
              permanently fixed to the wall with the included wall attachment
              devices.
            </p>
          </div>
          <div className='flex-1 hidden pl-2 sm:block'>
            <p>
              <b>ATTENTION</b>
            </p>
            <p>
              Risque de blessure grave ou mortelle en cas de basculement du
              meuble. Pour éviter que le meuble ne bascule, il faut le fixer au
              mur de façon permanente à l’aide des pièces pour fixation incluses
            </p>
          </div>
          <div className='flex-1 hidden pl-2 lg:block'>
            <p>
              <b>ADVERTENCIA</b>
            </p>
            <p>
              Pueden producirse lesiones graves o fatales si vuelca un mueble.
              Para evitar que vuelque, debe fijarse permanentemente a la pared
              con los dispositivos de fijación a la pared que se incluyen.
            </p>
          </div>
        </div>
      </section>

      <section className={css.page}>
        <div
          className='flex flex-row items-center justify-between'
          style={{ height: '25%' }}
        >
          <Piece quantity={19} id={101811}>
            <SpriteManual name='demons' />
          </Piece>
          <Piece quantity={91} id={101933}>
            <SpriteManual name='triangle' />
          </Piece>
        </div>
        <div
          className='flex flex-row items-center justify-between'
          style={{ height: '25%' }}
        >
          <Piece quantity={12} id={102053}>
            <SpriteManual name='insert' />
          </Piece>
          <Piece quantity={1} id={101697}>
            <SpriteManual name='mobius' />
          </Piece>
        </div>
        <div
          className='flex flex-row items-center justify-between'
          style={{ height: '40%' }}
        >
          <Piece quantity={11} id={102287}>
            <SpriteManual name='count' />
          </Piece>
        </div>
      </section>
      <section className={css.page}>
        <h2 className='text-3xl font-bold'>1</h2>
        <p>beep boop</p>
      </section>
    </Shell>
  )
}

export default Manual
