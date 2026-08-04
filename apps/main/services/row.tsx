import cn from 'clsx'
import type React from 'react'
import { useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import { matchScreen, querySmScreen } from 'services/screen'

const subscribeToScreen = (onChange: () => void) => {
  const query = window.matchMedia(querySmScreen)
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}

// external store, not a render-time window check:
// server html and hydration render must match under react 19
const useIsBelowSmScreen = () => {
  return !useSyncExternalStore(
    subscribeToScreen,
    () => matchScreen(querySmScreen),
    () => false,
  )
}

type RowProps = {
  left?: React.ReactNode
  right?: React.ReactNode
  teleport?: HTMLDivElement
  force?: boolean
}

const leftForSmallScreen = (props: RowProps) => {
  if (props.force) return props.left
  if (props.teleport) return createPortal(props.left, props.teleport)
  return null
}

const Row: React.FC<RowProps> = (props) => {
  const isBelowSmScreen = useIsBelowSmScreen()

  return (
    <div className='flex flex-row flex-1 w-full'>
      <div
        className={cn(
          'relative flex-col items-end flex-1 text-right sm:flex',
          props.force
            ? 'flex flex-none w-12 mr-4 sm:w-auto sm:mr-0 sm:flex-1'
            : 'hidden',
        )}
      >
        {isBelowSmScreen ? leftForSmallScreen(props) : props.left}
      </div>
      <div className='hidden w-16 sm:flex' />
      <div className='relative flex flex-col flex-[2]'>{props.right}</div>
    </div>
  )
}

export default Row
