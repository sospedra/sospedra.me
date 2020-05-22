import React from 'react'
import { createPortal } from 'react-dom'
import { matchScreen, querySmScreen } from 'service/screen'

const Row: React.FC<{
  left?: React.ReactNode
  right?: React.ReactNode
  teleport?: HTMLDivElement
  force?: boolean
}> = (props) => {
  const isSmScreen = !matchScreen(querySmScreen)
  let leftForSm = null

  if (props.force) {
    leftForSm = props.left
  } else if (props.teleport) {
    leftForSm = createPortal(props.left, props.teleport)
  }

  return (
    <div className='flex flex-row flex-1 w-full'>
      <div
        className={`relative flex-col items-end flex-1 ${
          props.force
            ? 'flex flex-none w-12 mr-4 sm:w-auto sm:mr-0 sm:flex-1'
            : 'hidden'
        } text-right sm:flex`}
      >
        {isSmScreen ? leftForSm : props.left}
      </div>
      <div className='hidden w-16 sm:flex' />
      <div className='relative flex flex-col flex-1' style={{ flex: 2 }}>
        {props.right}
      </div>
    </div>
  )
}

export default Row
