import React, { useRef, useContext } from 'react'
import { animated, useSpring } from 'react-spring'

import * as events from './events'
import * as matrix from './matrix'

const CameraCTX = React.createContext({})

export const useCamera = () => useContext(CameraCTX)

export const CameraProvider = (props) => {
  const cameraRef = useRef()
  const [{ top, left }, set] = useSpring(() => ({
    from: { top: 0, left: 0 },
    config: { mass: 10, tension: 180, friction: 180 },
    onRest: events.onFinish,
    ref: cameraRef,
  }))
  const setCamera = ({ row, column }) => {
    events.start()
    set(matrix.getPosition(row, column))
  }

  return (
    <CameraCTX.Provider value={{
      setCamera,
      registerOnFinish: events.registerOnFinish,
      cameraRef,
    }}>
      <matrix.Canvas top={top} left={left} />

      <animated.div
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
