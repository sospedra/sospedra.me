import { CanvasTexture } from 'three'

export const radialGlowTexture = (
  stops: readonly (readonly [number, string])[],
): CanvasTexture => {
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const g = canvas.getContext('2d')
  if (g) {
    const gradient = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    for (const [offset, color] of stops) gradient.addColorStop(offset, color)
    g.fillStyle = gradient
    g.fillRect(0, 0, 64, 64)
  }
  return new CanvasTexture(canvas)
}

export const markerGlowTexture = (): CanvasTexture =>
  radialGlowTexture([
    [0, 'rgba(255,255,255,1)'],
    [0.25, 'rgba(255,190,110,0.9)'],
    [0.6, 'rgba(255,154,60,0.35)'],
    [1, 'rgba(255,154,60,0)'],
  ])
