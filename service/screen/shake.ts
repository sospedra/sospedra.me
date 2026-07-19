import { useEffect } from 'react'

const createCoords = () => ({ x: 0, y: 0, z: 0 })

const selectCoords = (acceleration: DeviceMotionEventAcceleration | null) => {
  const { x, y, z } = acceleration || {}
  return !x || !y || !z ? createCoords() : { x, y, z }
}

export const useShake = (clbk: () => void) => {
  const vault = createCoords()

  useEffect(() => {
    const sensitivity = 20

    const onMotion = ({ accelerationIncludingGravity }: DeviceMotionEvent) => {
      if (!window.location.pathname.startsWith('/papers/')) {
        const { x, y, z } = selectCoords(accelerationIncludingGravity)
        const change = Math.abs(x - vault.x + y - vault.y + z - vault.z)
        if (change > sensitivity) {
          clbk()
        }

        vault.x = x
        vault.y = y
        vault.z = z
      }
    }

    window.addEventListener('devicemotion', onMotion)

    return () => {
      window.removeEventListener('devicemotion', onMotion)
    }
  })
}
