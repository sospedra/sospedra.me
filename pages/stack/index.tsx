import React, { useState } from 'react'
import { animated } from 'react-spring'
import { useMomentum } from 'service/momentum'
import Shell from 'components/Shell'
import Link, { LinkBack } from 'components/Link'
import Featured from 'components/Stack/Featured'
import StackCategory from 'components/Stack/Category'
import Tech from 'components/Stack/Tech'
import css from './stack.module.css'
import stack from './stack.json'

const description = `A curated list of the best high-quality up-to-date technologies of ${new Date().getUTCFullYear()}`
const categories = stack.reduce<{ [category: string]: number }>(
  (memo, tech) => {
    const patch = { ...memo }
    tech.categories.forEach((category) => {
      const current = patch[category]
      patch[category] = current ? current + 1 : 1
    })
    return patch
  },
  {},
)
// const tags = [...new Set(stack.map((x) => x.tags).flat())]

const Stack: React.FC<{}> = () => {
  const [category, setCategory] = useState('all')
  const delta = useMomentum('#vbody')

  return (
    <Shell
      title='Stack'
      className='relative w-full h-full max-w-4xl px-4 pt-12 pb-20 mx-auto text-white'
      description={description}
      canonical='/stack'
    >
      <Link url='/'>
        <LinkBack>Home</LinkBack>
      </Link>
      <h1 className='text-3xl md:text-4xl'>My hand-picked stack</h1>
      <p className='pb-10'>{description}</p>

      <div>
        <input
          placeholder='Type a name, tech, label, etc.'
          className='w-full font-serif text-2xl font-bold bg-transparent md:text-3xl text-cyan-400 focus:outline-none'
        />
      </div>

      <Featured />

      <h2 className='font-serif text-3xl'>Explore</h2>

      <ul className='flex flex-row w-full py-4 overflow-x-auto overflow-y-hidden'>
        <StackCategory
          current={category}
          category='all'
          quantity={stack.length}
          setCategory={setCategory}
        />
        {Object.entries(categories).map(([cate, quantity]) => (
          <StackCategory
            key={cate}
            current={category}
            category={cate}
            quantity={quantity}
            setCategory={setCategory}
          />
        ))}
      </ul>

      <animated.ul
        className={css.list}
        style={{
          transform: delta
            .interpolate({ range: [-300, 300], output: [-6, 6] })
            .interpolate((d) => `skewY(${d}deg)`),
        }}
      >
        {stack.map((tech) => (
          <Tech key={tech.url} delta={delta} {...tech} />
        ))}
      </animated.ul>
    </Shell>
  )
}

export default Stack
