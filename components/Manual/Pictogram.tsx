import React from 'react'
import cn from 'classnames'

const Pictogram: React.FC<{
  left: React.ReactNode
  right: React.ReactNode
  style?: React.CSSProperties
  willHide?: boolean
}> = ({ left, right, style = {}, willHide = false }) => {
  return (
    <div
      className='flex flex-row items-center w-full h-full border border-current rounded-lg md:p-4'
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

export default Pictogram
