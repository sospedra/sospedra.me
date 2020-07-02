import React from 'react'
import cn from 'classnames'
import Emoji from 'components/Emoji'
import css from './featured.module.css'

const Featured: React.FC<{}> = () => {
  return (
    <div className={css.featured}>
      <button className={css.category}>
        <p>Node.js</p>
      </button>
      <button className={cn('col-span-2 row-span-2', css.library)}>
        <Emoji is='▼' className='block text-4xl' />
        <p className='text-2xl'>The name of the library</p>
      </button>
      <button className={css.tag}>
        <p>Javascript</p>
      </button>
      <button className={cn('col-span-2', css.category)}>
        <p>
          <Emoji is='🔥' /> Serverless
        </p>
      </button>
      <button className={css.library}>
        <p>next.js</p>
      </button>
      <button className={css.tag}>
        <p>No-code</p>
      </button>
    </div>
  )
}

export default Featured
