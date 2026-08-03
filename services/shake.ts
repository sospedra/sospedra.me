import { useEffect } from 'react'

// target: a deliberate shake sums past this, a pocket bump stays under it
const SHAKE_THRESHOLD = 20

const readAcceleration = (
  acceleration: DeviceMotionEventAcceleration | null,
) => {
  const { x, y, z } = acceleration ?? {}
  if (x == null || y == null || z == null) return null
  return { x, y, z }
}

export const useShake = (onShake: () => void, enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return

    const baseline = { x: 0, y: 0, z: 0 }
    const onMotion = ({ accelerationIncludingGravity }: DeviceMotionEvent) => {
      const reading = readAcceleration(accelerationIncludingGravity)
      if (!reading) return

      const change =
        Math.abs(reading.x - baseline.x) +
        Math.abs(reading.y - baseline.y) +
        Math.abs(reading.z - baseline.z)
      baseline.x = reading.x
      baseline.y = reading.y
      baseline.z = reading.z
      if (change > SHAKE_THRESHOLD) onShake()
    }

    window.addEventListener('devicemotion', onMotion)
    return () => {
      window.removeEventListener('devicemotion', onMotion)
    }
  }, [onShake, enabled])
}
