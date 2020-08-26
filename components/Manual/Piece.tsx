import React from 'react'
import css from './piece.module.css'

const Piece: React.FC<{
  quantity: number
  id: number
}> = ({ children, quantity, id }) => {
  return (
    <div className='flex flex-col items-center justify-center flex-1 h-full pr-4 md:p-4'>
      <div className='relative h-full'>
        {children}
        <div className={css.piece}>{id}</div>
      </div>
      <span className='font-bold'>{quantity}x</span>
    </div>
  )
}

export default Piece
