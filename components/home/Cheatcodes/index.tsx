import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { useMousetrap } from 'service/mousetrap'

const Modal = dynamic(() => import('./Modal'), { ssr: false })

const Cheatcodes = React.forwardRef((_, ref?: React.Ref<HTMLButtonElement>) => {
  const [isActive, setIsActive] = useState(false)

  useMousetrap([['esc', () => setIsActive(false)]])

  return (
    <>
      {isActive && <Modal close={() => setIsActive(false)} />}
      <button ref={ref} onClick={() => setIsActive(true)}>
        Cheatcodes
      </button>
    </>
  )
})

export default Cheatcodes
