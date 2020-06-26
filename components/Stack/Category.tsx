import React from 'react'
import cn from 'classnames'
import css from './category.module.css'

const StackCategory: React.FC<{
  category: string
  quantity: number
  setCategory: (category: string) => void
  current: string
}> = (props) => {
  return (
    <li className='pr-6'>
      <button
        className={cn('focus:outline-none', {
          [css.category]: true,
        })}
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

export default StackCategory
