import React from 'react'
import { createPortal } from 'react-dom'
import { matchScreen, querySmScreen } from 'service/screen'

const Row: React.FC<{
  left?: React.ReactNode
  right?: React.ReactNode
  teleport?: HTMLDivElement
}> = (props) => {
  return (
    <div className='flex flex-row flex-1 w-full'>
      <div className='relative flex-col items-end flex-1 hidden text-right sm:flex'>
        {!matchScreen(querySmScreen) && props.teleport
          ? createPortal(props.left, props.teleport)
          : props.left}
      </div>
      <div className='hidden w-16 sm:flex' />
      <div className='relative flex flex-col flex-1' style={{ flex: 2 }}>
        {props.right}
      </div>
    </div>
  )
}

export default Row
