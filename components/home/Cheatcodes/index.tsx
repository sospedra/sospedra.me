import React, { useState } from 'react'
import dynamic from 'next/dynamic'
import { useMousetrap } from 'service/mousetrap'
import { query } from 'service/screen'

const Modal = dynamic(() => import('./Modal'), { ssr: false })

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
        <style jsx>{`
          @media ${query} {
            button {
              text-decoration: line-through;
              text-decoration-style: double;
              text-decoration-color: var(--pink);
            }
          }
        `}</style>
      </>
    )
  },
)

export default Cheatcodes
