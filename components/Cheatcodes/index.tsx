import dynamic from 'next/dynamic'
import React, { useState } from 'react'
import { useHotkeys } from 'service/hotkeys'
import Loading from './Loading'

const Modal = dynamic(() => import('./Modal'), {
  ssr: false,
  loading: Loading,
})

const Cheatcodes = React.forwardRef(function Cheatcodes(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
  ref?: React.Ref<HTMLButtonElement>,
) {
  const [isActive, setIsActive] = useState(false)

  useHotkeys([['Escape', () => setIsActive(false)]])

  return (
    <>
      {isActive && <Modal close={() => setIsActive(false)} />}
      <button {...props} ref={ref} onClick={() => setIsActive(true)}>
        Cheatcodes
      </button>
    </>
  )
})

export default Cheatcodes
