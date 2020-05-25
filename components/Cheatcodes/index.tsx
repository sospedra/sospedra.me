import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { useMousetrap } from 'service/mousetrap'
import Loading from './Loading'

const Modal = dynamic(() => import('./Modal'), {
  ssr: false,
  loading: Loading,
})

const Cheatcodes = React.forwardRef(
  (
    props: React.ButtonHTMLAttributes<HTMLButtonElement>,
    ref?: React.Ref<HTMLButtonElement>,
  ) => {
    const [isActive, setIsActive] = useState(false)

    useMousetrap([['esc', () => setIsActive(false)]])

    return (
      <>
        {isActive && <Modal close={() => setIsActive(false)} />}
        <button {...props} ref={ref} onClick={() => setIsActive(true)}>
          Cheatcodes
        </button>
      </>
    )
  },
)

export default Cheatcodes
