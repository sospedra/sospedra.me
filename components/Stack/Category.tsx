import React from 'react'
import cn from 'classnames'
import { useStack } from 'service/stack'
import css from './category.module.css'

const Category: React.FC<{
  category: string
  quantity: number
  setCategory: (category: string) => void
  current: string
}> = (props) => {
  return (
    <li className='pr-6'>
      <button
        className={cn('focus:outline-none', css.category)}
        onClick={() => props.setCategory(props.category)}
      >
        <span
          className={cn('pr-2 transition-colors duration-500', {
            'text-cyan-400': props.current === props.category,
          })}
        >
          {props.category}
        </span>
        <span className='px-2 text-sm bg-gray-700 rounded-full'>
          {props.quantity}
        </span>
        {props.current === props.category && (
          <span className={css.indicator}>▼</span>
        )}
      </button>
    </li>
  )
}

const CategoryList: React.FC<{}> = () => {
  const {
    category,
    categories,
    stack,
    setCategory,
    search,
    anchor,
  } = useStack()

  return (
    <section
      ref={anchor}
      style={{ willChange: 'transform' }}
      className={`transition-all duration-300 transform overflow-hidden ${
        !search
          ? 'opacity-100 max-h-screen'
          : 'opacity-0 max-h-0 -translate-y-32'
      }`}
    >
      <h2 className='text-3xl font-bold'>Explore by categories</h2>
      <ul className={css.list}>
        <Category
          current={category}
          category='all'
          quantity={stack.length}
          setCategory={setCategory}
        />
        {Object.entries(categories).map(([cate, quantity]) => (
          <Category
            key={cate}
            current={category}
            category={cate}
            quantity={quantity}
            setCategory={setCategory}
          />
        ))}
      </ul>
    </section>
  )
}

export default CategoryList
