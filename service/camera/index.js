import React, { useContext } from 'react'
import { animated, useSpring, config } from 'react-spring'

import * as events from './events'
import * as matrix from './matrix'

const CameraCTX = React.createContext({})

export const useCamera = () => useContext(CameraCTX)

export const CameraProvider = (props) => {
  const [{ top, left }, set] = useSpring(() => ({
    top: 0,
    left: 0,
    // config: config.molasses,
    onRest: events.onFinish,
  }))
  const scrollTop = top.interpolate((o) => o)
  const scrollLeft = left.interpolate((o) => o)
  const setCamera = ({ row, column }) => {
    events.start()
    set(matrix.getPosition(row, column))
  }

  return (
    <CameraCTX.Provider value={{
      setCamera,
      registerOnFinish: events.registerOnFinish
    }}>
      <matrix.Canvas />

      <animated.div
        scrollTop={scrollTop}
        scrollLeft={scrollLeft}
        style={{
          position: "absolute",
          overflow: "hidden",
          width: "100vw",
          height: "100vh",
        }}
      >
        {props.children}
      </animated.div>
    </CameraCTX.Provider>
  )
}
