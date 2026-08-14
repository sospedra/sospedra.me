import { useEffect } from 'react'

// a pocket bump spikes once or twice; a hard shake spikes on every reversal
const SPIKE_THRESHOLD = 20
const SPIKE_GAP_MS = 150
const SHAKE_WINDOW_MS = 2000
const SPIKES_PER_SHAKE = 8

// iOS gates devicemotion behind a per-visit permission dialog; skip it there
const motionNeedsPermission = () => {
  if (typeof DeviceMotionEvent === 'undefined') return true
  const { requestPermission } =
    DeviceMotionEvent as typeof DeviceMotionEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>
    }
  return requestPermission !== undefined
}

const readAcceleration = (
  acceleration: DeviceMotionEventAcceleration | null,
) => {
  const { x, y, z } = acceleration ?? {}
  if (x == null || y == null || z == null) return null
  return { x, y, z }
}

export const createSpikeCounter = () => {
  let counted: number[] = []
  return (now: number): boolean => {
    const last = counted.at(-1)
    if (last !== undefined && now - last < SPIKE_GAP_MS) return false
    counted = [...counted.filter((at) => at > now - SHAKE_WINDOW_MS), now]
    if (counted.length < SPIKES_PER_SHAKE) return false
    counted = []
    return true
  }
}

export const useShake = (onShake: () => void, enabled: boolean) => {
  useEffect(() => {
    if (!enabled || motionNeedsPermission()) return

    const countSpike = createSpikeCounter()
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
      if (change > SPIKE_THRESHOLD && countSpike(Date.now())) onShake()
    }

    window.addEventListener('devicemotion', onMotion)
    return () => window.removeEventListener('devicemotion', onMotion)
  }, [onShake, enabled])
}
