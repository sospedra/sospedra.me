import React from 'react'
import cn from 'classnames'
import Emoji from 'components/Emoji'
import css from './featured.module.css'
import { useStack } from 'service/stack'
import { createRange } from 'service/random'

const Featured: React.FC<{}> = () => {
  const { stack, filter, search, setCategory, scrollTo } = useStack()
  const newest = stack[0]
  const random = stack[createRange()(stack.length - 1)]
  const promoted = stack.find(({ name }) => name === 'next.js')

  return (
    <section
      style={{ willChange: 'transform' }}
      className={`transition-all duration-300 transform overflow-hidden ${
        !search
          ? 'opacity-100 max-h-screen py-12'
          : 'opacity-0 max-h-0 py-0 -translate-y-32'
      }`}
    >
      <h2 className='pb-8 text-3xl font-bold'>Featured collections</h2>
      <div className={css.featured}>
        <button
          className={css.category}
          onClick={() => {
            setCategory('service')
            scrollTo()
          }}
        >
          <p>View Services</p>
        </button>

        <a
          href={newest.route}
          target='_blank'
          rel='noopener noreferrer'
          className={cn('col-span-2 row-span-2', css.library)}
        >
          <Emoji is='▼' className={css.triangle} />
          <p className='text-2xl'>
            Discover{' '}
            <code className='font-mono md:whitespace-no-wrap'>
              {newest.name}
            </code>
          </p>
        </a>

        <a
          className={css.tag}
          href={random.route}
          target='_blank'
          rel='noopener noreferrer'
        >
          <p>Feeling lucky!</p>
        </a>

        <button
          className={cn('col-span-2', css.category)}
          onClick={() => setCategory('react')}
        >
          <p className='flex flex-row flex-wrap justify-center'>
            <Emoji is='⚛' className='text-3xl leading-6' />
            <span className='px-2'>Powered by</span>
            <code className='font-mono'>React</code>
          </p>
        </button>

        {promoted && (
          <a
            className={css.library}
            href={promoted.route}
            target='_blank'
            rel='noopener noreferrer'
          >
            <p>
              Go to <code className='font-mono'>{promoted.name}</code>
            </p>
          </a>
        )}

        <button
          className={css.tag}
          onClick={() => {
            filter(({ isGithub }) => !isGithub)
            scrollTo()
          }}
        >
          <p>
            <span className={css.negative}>Not</span> on GitHub
          </p>
        </button>
      </div>
    </section>
  )
}

export default Featured
