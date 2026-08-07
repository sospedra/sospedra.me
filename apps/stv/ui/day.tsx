import type { NodeDay } from 'services/types'
import { scrollToNow } from './scroll'

export const Day = (props: NodeDay) => {
  return (
    <li className='sticky top-0 z-20 flex flex-row items-center py-4 mb-8 bg-white border-b-2 border-teal-400'>
      <p className='flex flex-1'>
        <b className='mr-2'>{props.weekday}</b>
        {props.date}
      </p>
      <button
        className='px-2 mx-2 font-bold text-teal-600'
        onClick={scrollToNow}
        type='button'
      >
        Ahora
      </button>
    </li>
  )
}
