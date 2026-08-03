import type React from 'react'
import css from './piece.module.css'

const Piece: React.FC<{
  quantity: number
  id: number
  children: React.ReactNode
}> = ({ children, quantity, id }) => {
  return (
    <div className={css.item}>
      <div className={css.illustration}>
        {children}
        <div className={css.piece}>{id}</div>
      </div>
      <span className={css.quantity}>{quantity}x</span>
    </div>
  )
}

export default Piece
