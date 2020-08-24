import { NextPage } from 'next'
import css from './manual.module.css'
import Shell from 'components/Shell'
import SpriteBust from 'components/Sprite/Bust'

export const MANUAL_DESC =
  'How to work with Rubén Sospedra. A manual of instructions. What I value, how I look at problems, what are my blind spots, and how to build trust with me.'

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
        <p>thinks u need</p>
      </section>
      <section className={css.page}>
        <h2>How to</h2>
      </section>
    </Shell>
  )
}

export default Manual
